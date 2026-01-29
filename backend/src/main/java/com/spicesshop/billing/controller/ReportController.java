package com.spicesshop.billing.controller;

import com.spicesshop.billing.service.ReportService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/reports"})
@CrossOrigin(origins = {"*"})
public class ReportController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping({"/daily"})
    public ResponseEntity<?> getDailyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.reportService.getDailyReport(date, companyName)
                .orElseGet(() -> this.reportService.generateDailyReport(date, companyName)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/monthly"})
    public ResponseEntity<?> getMonthlyReport(
            @RequestParam Integer year, 
            @RequestParam Integer month, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.reportService.getMonthlyReport(year, month, companyName)
                .orElseGet(() -> this.reportService.generateMonthlyReport(year, month, companyName)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
