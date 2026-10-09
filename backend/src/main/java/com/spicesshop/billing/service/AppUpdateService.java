package com.spicesshop.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spicesshop.billing.dto.UpdateManifest;
import java.io.InputStream;
import java.net.URI;
import java.net.URL;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.SpringApplication;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;

@Service
public class AppUpdateService {

    private static final Logger log = LoggerFactory.getLogger(AppUpdateService.class);

    public static final String JAR_NAME = "spices-billing.jar";
    public static final String UPDATE_JAR_NAME = "spices-billing-update.jar";
    public static final String APPLY_BAT = "apply-update.bat";

    private final ObjectMapper objectMapper;
    private final ApplicationContext applicationContext;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .followRedirects(HttpClient.Redirect.NORMAL)
        .connectTimeout(Duration.ofSeconds(15))
        .build();

    @Value("${app.version:0}")
    private String currentVersion;

    @Value("${app.update.enabled:false}")
    private boolean enabled;

    @Value("${app.update.manifest-url:}")
    private String manifestUrl;

    @Value("${app.update.github-token:}")
    private String githubToken;

    /** When true, the left Update slide can be tested without a newer GitHub JAR. */
    @Value("${app.update.ui-preview:false}")
    private boolean uiPreview;

    public AppUpdateService(ObjectMapper objectMapper, ApplicationContext applicationContext) {
        this.objectMapper = objectMapper;
        this.applicationContext = applicationContext;
    }

    public Map<String, Object> status() {
        Map<String, Object> out = new LinkedHashMap<>();
        Path jarPath = runningJarPath();
        boolean fromJar = runningFromJar();
        out.put("currentVersion", this.currentVersion);
        out.put("enabled", this.enabled && this.manifestUrl != null && !this.manifestUrl.isBlank());
        out.put("runningFromJar", fromJar);
        out.put("jarPath", jarPath != null ? jarPath.toString() : "");
        out.put("manifestUrl", this.manifestUrl != null ? this.manifestUrl : "");
        out.put("updateReady", Files.isRegularFile(updateJarPath()));
        out.put("uiPreview", this.uiPreview);
        if (this.uiPreview) {
            out.put("enabled", true);
            out.put("updateAvailable", true);
            out.put("latestVersion", "99.0.0");
            out.put("message", "Preview only. Click Update to confirm the button (no JAR will be replaced).");
            log.info("App update check (preview): current={}", this.currentVersion);
            return out;
        }
        if (!this.enabled || this.manifestUrl == null || this.manifestUrl.isBlank()) {
            out.put("updateAvailable", false);
            out.put("message", "Update URL is not set.");
            log.warn("App update check skipped: enabled={} manifestUrl='{}'", this.enabled, this.manifestUrl);
            return out;
        }
        try {
            UpdateManifest manifest = fetchManifest();
            String latest = manifest.getVersion() != null ? manifest.getVersion().trim() : "";
            out.put("latestVersion", latest);
            boolean newer = compareVersions(latest, this.currentVersion) > 0;
            out.put("jarUrl", manifest.getJarUrl());
            if (!fromJar) {
                out.put("updateAvailable", false);
                out.put("message", "GitHub latest is " + latest + " but this PC is not running spices-billing.jar (path: "
                    + (jarPath != null ? jarPath : "unknown") + "). Use start-billing.bat.");
            } else if (!newer) {
                out.put("updateAvailable", false);
                out.put("message", "This shop is on the latest version (" + this.currentVersion + ").");
            } else if (Files.isRegularFile(updateJarPath())) {
                out.put("updateAvailable", true);
                out.put("message", "Update downloaded. Restart billing to install.");
            } else {
                out.put("updateAvailable", true);
                out.put("message", "A new version is available.");
            }
            log.info("App update check: current={} latest={} fromJar={} jar={} available={} {}",
                this.currentVersion, latest, fromJar, jarPath, out.get("updateAvailable"), out.get("message"));
        } catch (Exception e) {
            out.put("updateAvailable", false);
            out.put("message", "Could not check for updates (offline or URL). " + safeMsg(e));
            log.warn("App update check failed current={} url={} fromJar={} jar={}: {}",
                this.currentVersion, this.manifestUrl, fromJar, jarPath, safeMsg(e));
        }
        return out;
    }

    public Map<String, Object> downloadUpdate() throws Exception {
        if (this.uiPreview) {
            return status();
        }
        if (!runningFromJar()) {
            throw new IllegalStateException("Start billing with spices-billing.jar on the shop PC.");
        }
        UpdateManifest manifest = fetchManifest();
        if (compareVersions(manifest.getVersion(), this.currentVersion) <= 0) {
            throw new IllegalStateException("Already up to date.");
        }
        if (manifest.getJarUrl() == null || manifest.getJarUrl().isBlank()) {
            throw new IllegalStateException("Manifest has no jarUrl.");
        }
        Path target = updateJarPath();
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(manifest.getJarUrl().trim()))
            .timeout(Duration.ofMinutes(10))
            .GET();
        applyAuth(builder);
        HttpResponse<InputStream> response = this.httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("Download failed HTTP " + response.statusCode());
        }
        Files.copy(response.body(), target, StandardCopyOption.REPLACE_EXISTING);
        Map<String, Object> out = status();
        out.put("downloaded", true);
        return out;
    }

    public Map<String, Object> applyAndRestart() throws Exception {
        if (this.uiPreview) {
            return Map.of(
                "ok", true,
                "preview", true,
                "message", "Preview OK. After you install spices-billing.jar at the shop, Update will download and restart for real."
            );
        }
        if (!runningFromJar()) {
            throw new IllegalStateException("Start billing with spices-billing.jar on the shop PC.");
        }
        Path dir = jarDirectory();
        Path updateJar = dir.resolve(UPDATE_JAR_NAME);
        if (!Files.isRegularFile(updateJar)) {
            downloadUpdate();
        }
        if (!Files.isRegularFile(updateJar)) {
            throw new IllegalStateException("Update file was not downloaded.");
        }
        Path bat = dir.resolve(APPLY_BAT);
        String script = """
            @echo off
            cd /d "%~dp0"
            timeout /t 4 /nobreak >nul
            if exist "spices-billing-update.jar" (
              copy /y "spices-billing-update.jar" "spices-billing.jar"
              del "spices-billing-update.jar"
            )
            if exist "start-billing.bat" (
              start "" "start-billing.bat"
            ) else (
              start "" java -jar "spices-billing.jar" --spring.config.additional-location=file:./
            )
            """;
        Files.writeString(bat, script);
        new ProcessBuilder("cmd", "/c", "start", "", APPLY_BAT)
            .directory(dir.toFile())
            .start();
        Thread restarter = new Thread(() -> {
            try {
                Thread.sleep(800);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            int code = SpringApplication.exit(this.applicationContext, () -> 0);
            System.exit(code);
        }, "apply-update");
        restarter.start();
        return Map.of("ok", true, "message", "Restarting to install the update.");
    }

    private UpdateManifest fetchManifest() throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(this.manifestUrl.trim()))
            .timeout(Duration.ofSeconds(20))
            .GET();
        applyAuth(builder);
        if (this.githubToken != null && !this.githubToken.isBlank()) {
            builder.header("Accept", "application/vnd.github.raw+json");
        }
        log.info("Fetching update manifest {}", this.manifestUrl);
        HttpResponse<String> response = this.httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            log.warn("Manifest HTTP {} body={}", response.statusCode(),
                response.body() != null && response.body().length() > 200
                    ? response.body().substring(0, 200) : response.body());
            throw new IllegalStateException("Manifest HTTP " + response.statusCode());
        }
        String body = response.body() == null ? "" : response.body().trim();
        if (body.startsWith("{")) {
            return this.objectMapper.readValue(body, UpdateManifest.class);
        }
        UpdateManifest manifest = new UpdateManifest();
        String[] lines = body.split("\\R");
        manifest.setVersion(lines[0].trim());
        if (lines.length > 1) {
            manifest.setJarUrl(lines[1].trim());
        }
        return manifest;
    }

    private void applyAuth(HttpRequest.Builder builder) {
        String token = this.githubToken;
        if (token == null || token.isBlank()) {
            token = System.getenv("APP_UPDATE_GITHUB_TOKEN");
        }
        if (token != null && !token.isBlank()) {
            builder.header("Authorization", "Bearer " + token.trim());
        }
    }

    private boolean runningFromJar() {
        Path path = runningJarPath();
        if (path == null) {
            return false;
        }
        String name = path.getFileName().toString().toLowerCase();
        return name.endsWith(".jar");
    }

    private Path runningJarPath() {
        try {
            URL loc = AppUpdateService.class.getProtectionDomain().getCodeSource().getLocation();
            if (loc == null) {
                return null;
            }
            String raw = loc.toString();
            int bang = raw.indexOf('!');
            if (bang >= 0) {
                raw = raw.substring(0, bang);
            }
            if (raw.startsWith("jar:")) {
                raw = raw.substring(4);
            }
            URI uri = URI.create(raw);
            if ("file".equalsIgnoreCase(uri.getScheme())) {
                return Path.of(uri).toAbsolutePath().normalize();
            }
            return Path.of(loc.toURI()).toAbsolutePath().normalize();
        } catch (Exception e) {
            log.warn("Could not resolve running JAR path: {}", safeMsg(e));
            return null;
        }
    }

    private Path jarDirectory() {
        Path jar = runningJarPath();
        if (jar != null && jar.getParent() != null) {
            return jar.getParent();
        }
        return Path.of(".").toAbsolutePath();
    }

    private Path updateJarPath() {
        return jarDirectory().resolve(UPDATE_JAR_NAME);
    }

    static int compareVersions(String latest, String current) {
        int[] a = parseVersion(latest);
        int[] b = parseVersion(current);
        int n = Math.max(a.length, b.length);
        for (int i = 0; i < n; i++) {
            int av = i < a.length ? a[i] : 0;
            int bv = i < b.length ? b[i] : 0;
            if (av != bv) {
                return Integer.compare(av, bv);
            }
        }
        return 0;
    }

    private static int[] parseVersion(String raw) {
        if (raw == null || raw.isBlank()) {
            return new int[] {0};
        }
        String cleaned = raw.trim().replaceFirst("^[vV]", "");
        String[] parts = cleaned.split("[^0-9]+");
        int[] out = new int[parts.length];
        for (int i = 0; i < parts.length; i++) {
            if (parts[i].isEmpty()) {
                continue;
            }
            try {
                out[i] = Integer.parseInt(parts[i]);
            } catch (NumberFormatException e) {
                out[i] = 0;
            }
        }
        return out;
    }

    private static String safeMsg(Exception e) {
        String m = e.getMessage();
        return m == null ? e.getClass().getSimpleName() : m;
    }
}
