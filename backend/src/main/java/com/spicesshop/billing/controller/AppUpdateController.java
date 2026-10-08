package com.spicesshop.billing.controller;

import com.spicesshop.billing.service.AppUpdateService;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/app")
public class AppUpdateController {

    private final AppUpdateService appUpdateService;

    public AppUpdateController(AppUpdateService appUpdateService) {
        this.appUpdateService = appUpdateService;
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
}
