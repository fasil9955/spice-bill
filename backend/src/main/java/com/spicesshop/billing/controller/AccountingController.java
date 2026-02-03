package com.spicesshop.billing.controller;

import com.spicesshop.billing.dto.AccountingDaySummaryResponse;
import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.service.AccountingDaySummaryService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
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
            BigDecimal closingCash = (summary != null && summary.getClosingCash() != null) ? summary.getClosingCash() : null;
            BigDecimal closingGpayTotal = (summary != null && summary.getClosingGpayTotal() != null) ? summary.getClosingGpayTotal() : null;

            // Opening = yesterday's closing
            LocalDate yesterday = date.minusDays(1);
            Optional<AccountingDaySummary> yesterdaySummary = this.accountingDaySummaryService.getSummary(companyName, yesterday);
            BigDecimal openingCash = yesterdaySummary.map(AccountingDaySummary::getClosingCash).filter(v -> v != null).orElse(BigDecimal.ZERO);
            BigDecimal openingUpi = yesterdaySummary.map(AccountingDaySummary::getClosingGpayTotal).filter(v -> v != null).orElse(BigDecimal.ZERO);

            return ResponseEntity.ok(new AccountingDaySummaryResponse(
                date.toString(), billingBookSales, openingCash, openingUpi, closingCash, closingGpayTotal));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/summary"})
    public ResponseEntity<?> updateDaySummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            @RequestBody Map<String, Object> payload, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }

            BigDecimal billingBookSales = toBigDecimal(payload.get("billingBookSales"));
            if (billingBookSales == null) {
                billingBookSales = BigDecimal.ZERO;
            }
            BigDecimal closingCash = toBigDecimal(payload.get("closingCash"));
            BigDecimal closingGpayTotal = toBigDecimal(payload.get("closingGpayTotal"));

            AccountingDaySummary summary = this.accountingDaySummaryService.upsertSummary(
                companyName, date, billingBookSales, closingCash, closingGpayTotal);

            LocalDate yesterday = date.minusDays(1);
            Optional<AccountingDaySummary> yesterdaySummary = this.accountingDaySummaryService.getSummary(companyName, yesterday);
            BigDecimal openingCash = yesterdaySummary.map(AccountingDaySummary::getClosingCash).filter(v -> v != null).orElse(BigDecimal.ZERO);
            BigDecimal openingUpi = yesterdaySummary.map(AccountingDaySummary::getClosingGpayTotal).filter(v -> v != null).orElse(BigDecimal.ZERO);

            return ResponseEntity.ok(new AccountingDaySummaryResponse(
                date.toString(), summary.getBillingBookSales(), openingCash, openingUpi,
                summary.getClosingCash(), summary.getClosingGpayTotal()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return null;
        if (value instanceof BigDecimal) return (BigDecimal) value;
        if (value instanceof Number) return BigDecimal.valueOf(((Number) value).doubleValue());
        try {
            return new BigDecimal(value.toString());
        } catch (Exception e) {
            return null;
        }
    }
}
