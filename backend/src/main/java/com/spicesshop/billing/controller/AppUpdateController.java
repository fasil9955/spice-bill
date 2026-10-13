package com.spicesshop.billing.controller;

import com.spicesshop.billing.service.AppUpdateService;
import com.spicesshop.billing.service.ProblemReportService;
import com.spicesshop.billing.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/app")
public class AppUpdateController {

    private final AppUpdateService appUpdateService;
    private final ProblemReportService problemReportService;
    private final JwtUtil jwtUtil;

    public AppUpdateController(
            AppUpdateService appUpdateService,
            ProblemReportService problemReportService,
            JwtUtil jwtUtil) {
        this.appUpdateService = appUpdateService;
        this.problemReportService = problemReportService;
        this.jwtUtil = jwtUtil;
    }

    @GetMapping("/update-status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(this.appUpdateService.status());
    }

    @PostMapping("/update-download")
    public ResponseEntity<?> download() {
        try {
            return ResponseEntity.ok(this.appUpdateService.downloadUpdate());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/update-restart")
    public ResponseEntity<?> restart() {
        try {
            return ResponseEntity.ok(this.appUpdateService.applyAndRestart());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/problem-report")
    public ResponseEntity<?> problemReport(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            String auth = request.getHeader("Authorization");
            if (auth == null || !auth.startsWith("Bearer ")) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            String token = auth.substring(7);
            String company = this.jwtUtil.extractCompanyName(token);
            if (company == null || company.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            String note = payload != null && payload.get("note") != null ? String.valueOf(payload.get("note")) : "";
            return ResponseEntity.ok(this.problemReportService.send(
                company,
                this.jwtUtil.extractRole(token),
                this.jwtUtil.extractUserId(token),
                note
            ));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Could not send the report."));
        }
    }
}
