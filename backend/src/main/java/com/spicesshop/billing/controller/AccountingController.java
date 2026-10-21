package com.spicesshop.billing.controller;

import com.spicesshop.billing.dto.AccountingDaySummaryResponse;
import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.service.AccountingDaySummaryService;
import com.spicesshop.billing.service.BossHubSyncService;
import com.spicesshop.billing.service.DailyCustomerNumbersMailService;
import com.spicesshop.billing.service.ExpenseService;
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
    private DailyCustomerNumbersMailService dailyCustomerNumbersMailService;

    @Autowired
    private BossHubSyncService bossHubSyncService;

    @Autowired
    private ExpenseService expenseService;

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
            String paymentDetailsJson = (summary != null) ? summary.getPaymentDetailsJson() : null;

            // Opening = yesterday's closing
            LocalDate yesterday = date.minusDays(1);
            Optional<AccountingDaySummary> yesterdaySummary = this.accountingDaySummaryService.getSummary(companyName, yesterday);
            BigDecimal openingCash = yesterdaySummary.map(AccountingDaySummary::getClosingCash).filter(v -> v != null).orElse(BigDecimal.ZERO);

            AccountingDaySummaryResponse body = new AccountingDaySummaryResponse(
                date.toString(), billingBookSales, openingCash, BigDecimal.ZERO, closingCash, closingGpayTotal);
            body.setPaymentDetailsJson(paymentDetailsJson);
            body.setDayCloseCleared(summary != null && Boolean.TRUE.equals(summary.getDayCloseCleared()));
            return ResponseEntity.ok(body);
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
            String paymentDetailsJson = null;
            Object pd = payload.get("paymentDetailsJson");
            if (pd != null) {
                paymentDetailsJson = pd.toString();
            }

            AccountingDaySummary summary = this.accountingDaySummaryService.upsertSummary(
                companyName, date, billingBookSales, closingCash, closingGpayTotal, paymentDetailsJson);

            String customerNumbersEmail = null;
            Object sendPhones = payload.get("sendCustomerPhones");
            boolean shouldSend = Boolean.TRUE.equals(sendPhones)
                || (sendPhones != null && "true".equalsIgnoreCase(sendPhones.toString()));
            if (shouldSend) {
                customerNumbersEmail = this.dailyCustomerNumbersMailService.sendOnDayCloseIfNeeded(companyName, date);
            }

            LocalDate yesterday = date.minusDays(1);
            Optional<AccountingDaySummary> yesterdaySummary = this.accountingDaySummaryService.getSummary(companyName, yesterday);
            BigDecimal openingCash = yesterdaySummary.map(AccountingDaySummary::getClosingCash).filter(v -> v != null).orElse(BigDecimal.ZERO);

            AccountingDaySummaryResponse body = new AccountingDaySummaryResponse(
                date.toString(), summary.getBillingBookSales(), openingCash, BigDecimal.ZERO,
                summary.getClosingCash(), summary.getClosingGpayTotal());
            body.setPaymentDetailsJson(summary.getPaymentDetailsJson());
            body.setCustomerNumbersEmail(customerNumbersEmail);
            body.setDayCloseCleared(Boolean.TRUE.equals(summary.getDayCloseCleared()));
            return ResponseEntity.ok(body);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Print day-close: send snapshot to boss phone, then clear expenses on this page. */
    @PostMapping({"/day-close-print"})
    public ResponseEntity<?> dayClosePrint(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            boolean alreadyCleared = this.accountingDaySummaryService.getSummary(companyName, date)
                .map(s -> Boolean.TRUE.equals(s.getDayCloseCleared()))
                .orElse(false);
            if (alreadyCleared) {
                return ResponseEntity.ok(Map.of(
                    "ok", true,
                    "hubSent", false,
                    "expensesCleared", 0,
                    "alreadyCleared", true
                ));
            }
            boolean hubSent = this.bossHubSyncService.pushDayClose(companyName, date);
            int staffMoved = this.expenseService.moveEmployeeExpensesToStaffForDate(companyName, date);
            int otherExpensesCleared = this.expenseService.deleteNonEmployeeExpensesForDate(companyName, date);
            this.accountingDaySummaryService.clearEnteredValues(companyName, date, true);
            boolean queued = !hubSent && this.bossHubSyncService.isConfigured()
                && this.bossHubSyncService.isQueued(companyName, date);
            return ResponseEntity.ok(Map.of(
                "ok", true,
                "hubSent", hubSent,
                "queued", queued,
                "expensesCleared", otherExpensesCleared,
                "staffMoved", staffMoved,
                "alreadyCleared", false
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Settings: wipe typed accounting for one date. Keeps system sales, cash, employee expenses. */
    @PostMapping({"/clear-entered"})
    public ResponseEntity<?> clearEntered(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            int staffMoved = this.expenseService.moveEmployeeExpensesToStaffForDate(companyName, date);
            int otherExpenses = this.expenseService.deleteNonEmployeeExpensesForDate(companyName, date);
            this.accountingDaySummaryService.clearEnteredValues(companyName, date, false);
            return ResponseEntity.ok(Map.of(
                "ok", true,
                "otherExpensesCleared", otherExpenses,
                "staffMoved", staffMoved
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/clear-entered-all"})
    public ResponseEntity<?> clearEnteredAll(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            int staffMoved = this.expenseService.moveAllEmployeeExpensesToStaff(companyName);
            int otherExpenses = this.expenseService.deleteAllNonEmployeeExpenses(companyName);
            int days = this.accountingDaySummaryService.clearEnteredValuesAllDates(companyName);
            return ResponseEntity.ok(Map.of(
                "ok", true,
                "otherExpensesCleared", otherExpenses,
                "staffMoved", staffMoved,
                "daysCleared", days
            ));
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
