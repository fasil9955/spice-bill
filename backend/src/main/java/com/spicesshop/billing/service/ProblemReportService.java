package com.spicesshop.billing.service;

import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ProblemReportService {

    private static final Logger log = LoggerFactory.getLogger(ProblemReportService.class);
    private static final int MAX_NOTE = 2000;
    private static final int TAIL_LINES = 120;
    private static final int MAX_LOG_CHARS = 40_000;
    private static final Duration COOLDOWN = Duration.ofSeconds(90);
    private static final Pattern SECRET_LINE = Pattern.compile(
        "(?i)(password|passwd|secret|token|authorization|mail_password|github-token|jdbc:mysql)"
    );

    private final ConcurrentHashMap<String, Instant> lastSent = new ConcurrentHashMap<>();

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${app.problem-report.to:fasilpvr52@gmail.com}")
    private String reportTo;

    @Value("${app.version:0}")
    private String appVersion;

    @Value("${logging.file.name:logs/spices-billing.log}")
    private String logFileName;

    public Map<String, Object> send(String companyName, String role, Integer userId, String noteRaw) {
        Map<String, Object> out = new LinkedHashMap<>();
        String note = noteRaw == null ? "" : noteRaw.trim();
        if (note.length() < 8) {
            throw new IllegalArgumentException("Write a short note about what went wrong (at least a few words).");
        }
        if (note.length() > MAX_NOTE) {
            note = note.substring(0, MAX_NOTE);
        }
        String company = companyName != null ? companyName.trim() : "unknown";
        Instant now = Instant.now();
        Instant prev = this.lastSent.get(company);
        if (prev != null && Duration.between(prev, now).compareTo(COOLDOWN) < 0) {
            throw new IllegalStateException("Wait a minute before sending another report from this shop.");
        }
        if (this.mailSender == null || !StringUtils.hasText(this.mailUsername)) {
            throw new IllegalStateException("Email is not set up on this PC. WhatsApp the owner and send logs/spices-billing.log.");
        }

        Path logPath = resolveLogFile();
        String logTail = readTailRedacted(logPath);

        StringBuilder body = new StringBuilder();
        body.append("Shop problem report\n");
        body.append("Time: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))).append("\n");
        body.append("Company: ").append(company).append("\n");
        body.append("Role: ").append(role != null ? role : "—").append("\n");
        body.append("User id: ").append(userId != null ? userId : "—").append("\n");
        body.append("App version: ").append(this.appVersion).append("\n");
        body.append("Log file: ").append(logPath != null ? logPath : "(not found)").append("\n\n");
        body.append("What happened:\n").append(note).append("\n\n");
        body.append("Last log lines (secrets stripped):\n");
        body.append(logTail);

        try {
            String from = StringUtils.hasText(this.mailFrom) ? this.mailFrom.trim() : this.mailUsername.trim();
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(this.reportTo.trim());
            helper.setSubject("Billing problem – " + company + " – v" + this.appVersion);
            helper.setText(body.toString(), false);
            this.mailSender.send(message);
        } catch (Exception e) {
            log.warn("Problem report email failed for {}: {}", company, e.getMessage());
            throw new IllegalStateException("Could not send email. Check internet, then try again or WhatsApp the owner.");
        }
        this.lastSent.put(company, now);
        out.put("ok", true);
        out.put("message", "Report sent. The owner will see it in email.");
        return out;
    }

    Path resolveLogFile() {
        List<Path> candidates = new ArrayList<>();
        if (StringUtils.hasText(this.logFileName)) {
            Path named = Path.of(this.logFileName.trim());
            candidates.add(named.isAbsolute() ? named : Path.of(System.getProperty("user.dir", ".")).resolve(named));
        }
        candidates.add(Path.of(System.getProperty("user.dir", ".")).resolve("logs").resolve("spices-billing.log"));
        for (Path p : candidates) {
            if (p != null && Files.isRegularFile(p)) {
                return p.toAbsolutePath().normalize();
            }
        }
        return candidates.isEmpty() ? null : candidates.get(0).toAbsolutePath().normalize();
    }

    static String redactLine(String line) {
        if (line == null) {
            return "";
        }
        if (SECRET_LINE.matcher(line).find()) {
            return "[redacted line]";
        }
        return line;
    }

    String readTailRedacted(Path logPath) {
        if (logPath == null || !Files.isRegularFile(logPath)) {
            return "(No log file yet. Start billing with start-billing.bat so logs/spices-billing.log is created.)\n";
        }
        try {
            List<String> all = Files.readAllLines(logPath, StandardCharsets.UTF_8);
            int from = Math.max(0, all.size() - TAIL_LINES);
            StringBuilder sb = new StringBuilder();
            for (int i = from; i < all.size(); i++) {
                sb.append(redactLine(all.get(i))).append('\n');
                if (sb.length() >= MAX_LOG_CHARS) {
                    break;
                }
            }
            return sb.toString();
        } catch (Exception e) {
            log.warn("Could not read log {}: {}", logPath, e.getMessage());
            return "(Could not read log: " + e.getMessage() + ")\n";
        }
    }
}
