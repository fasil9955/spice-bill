package com.spicesshop.billing.controller;

import com.spicesshop.billing.dto.AccountingDaySummaryResponse;
import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.service.AccountingDaySummaryService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/accounting"})
@CrossOrigin(origins = {"*"})
public class AccountingController {

    @Autowired
    private AccountingDaySummaryService accountingDaySummaryService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping({"/summary"})
    public ResponseEntity<?> getDaySummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            AccountingDaySummary summary = this.accountingDaySummaryService.getSummary(companyName, date).orElse(null);
            BigDecimal billingBookSales = (summary != null && summary.getBillingBookSales() != null) ? 
                summary.getBillingBookSales() : BigDecimal.ZERO;

            return ResponseEntity.ok(new AccountingDaySummaryResponse(date.toString(), billingBookSales));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/summary"})
    public ResponseEntity<?> updateDaySummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            @RequestBody Map<String, BigDecimal> payload, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            BigDecimal billingBookSales = payload.get("billingBookSales");
            if (billingBookSales == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "billingBookSales is required"));
            }

            AccountingDaySummary summary = this.accountingDaySummaryService.upsertSummary(companyName, date, billingBookSales);
            return ResponseEntity.ok(new AccountingDaySummaryResponse(date.toString(), summary.getBillingBookSales()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
