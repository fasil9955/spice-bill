package com.spicesshop.billing.service;

import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.repository.AccountingDaySummaryRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountingDaySummaryService {

    @Autowired
    private AccountingDaySummaryRepository accountingDaySummaryRepository;

    @Autowired
    private ExpenseService expenseService;

    public Optional<AccountingDaySummary> getSummary(String companyName, LocalDate reportDate) {
        return this.accountingDaySummaryRepository.findByCompanyNameAndReportDate(companyName, reportDate);
    }

    @Transactional
    public AccountingDaySummary upsertSummary(String companyName, LocalDate reportDate, BigDecimal billingBookSales,
            BigDecimal closingCash, BigDecimal closingGpayTotal, String paymentDetailsJson, BigDecimal closingUpi) {
        AccountingDaySummary summary = this.accountingDaySummaryRepository
            .findByCompanyNameAndReportDate(companyName, reportDate)
            .orElseGet(AccountingDaySummary::new);

        summary.setCompanyName(companyName);
        summary.setReportDate(reportDate);
        summary.setBillingBookSales(billingBookSales != null ? billingBookSales : java.math.BigDecimal.ZERO);
        if (closingCash != null) summary.setClosingCash(closingCash);
        if (closingGpayTotal != null) summary.setClosingGpayTotal(closingGpayTotal);
        if (paymentDetailsJson != null) summary.setPaymentDetailsJson(paymentDetailsJson);
        if (closingUpi != null) summary.setClosingUpi(closingUpi);

        return this.accountingDaySummaryRepository.save(summary);
    }

    @Transactional
    public AccountingDaySummary markDayCloseCleared(String companyName, LocalDate reportDate) {
        AccountingDaySummary summary = this.accountingDaySummaryRepository
            .findByCompanyNameAndReportDate(companyName, reportDate)
            .orElseGet(AccountingDaySummary::new);
        summary.setCompanyName(companyName);
        summary.setReportDate(reportDate);
        if (summary.getBillingBookSales() == null) {
            summary.setBillingBookSales(BigDecimal.ZERO);
        }
        summary.setDayCloseCleared(true);
        return this.accountingDaySummaryRepository.save(summary);
    }

    /** Wipe typed day-close fields. Keeps cash balance and does not touch invoices. */
    @Transactional
    public void clearEnteredValues(String companyName, LocalDate reportDate, boolean markCleared) {
        AccountingDaySummary summary = this.accountingDaySummaryRepository
            .findByCompanyNameAndReportDate(companyName, reportDate)
            .orElse(null);
        if (summary == null) {
            if (!markCleared) {
                return;
            }
            summary = new AccountingDaySummary();
            summary.setCompanyName(companyName);
            summary.setReportDate(reportDate);
            summary.setBillingBookSales(BigDecimal.ZERO);
        }
        summary.setBillingBookSales(BigDecimal.ZERO);
        summary.setClosingGpayTotal(BigDecimal.ZERO);
        summary.setPaymentDetailsJson("{\"cards\":[],\"upis\":[]}");
        if (markCleared) {
            summary.setDayCloseCleared(true);
        } else {
            summary.setDayCloseCleared(false);
        }
        this.accountingDaySummaryRepository.save(summary);
    }

    @Transactional
    public int clearEnteredValuesAllDates(String companyName) {
        int n = 0;
        for (AccountingDaySummary summary : this.accountingDaySummaryRepository.findByCompanyName(companyName)) {
            summary.setBillingBookSales(BigDecimal.ZERO);
            summary.setClosingGpayTotal(BigDecimal.ZERO);
            summary.setPaymentDetailsJson("{\"cards\":[],\"upis\":[]}");
            summary.setDayCloseCleared(true);
            this.accountingDaySummaryRepository.save(summary);
            n++;
        }
        return n;
    }

    @Transactional
    public AccountingDaySummary reopenTodayForEdit(String companyName, LocalDate reportDate) {
        if (!LocalDate.now().equals(reportDate)) {
            throw new RuntimeException("Only today's day-close can be edited");
        }
        AccountingDaySummary summary = this.accountingDaySummaryRepository
            .findByCompanyNameAndReportDate(companyName, reportDate)
            .orElseGet(AccountingDaySummary::new);
        summary.setCompanyName(companyName);
        summary.setReportDate(reportDate);
        if (summary.getBillingBookSales() == null) {
            summary.setBillingBookSales(BigDecimal.ZERO);
        }
        summary.setDayCloseCleared(false);
        return this.accountingDaySummaryRepository.save(summary);
    }

    /** Yesterday and older printed days: move staff payouts, wipe other expenses and splits. Cash stays. */
    @Transactional
    public void purgeClearedDaysBeforeToday(String companyName) {
        LocalDate today = LocalDate.now();
        List<AccountingDaySummary> old = this.accountingDaySummaryRepository
            .findByCompanyNameAndDayCloseClearedTrueAndReportDateBefore(companyName, today);
        for (AccountingDaySummary summary : old) {
            LocalDate d = summary.getReportDate();
            this.expenseService.moveEmployeeExpensesToStaffForDate(companyName, d);
            this.expenseService.deleteNonEmployeeExpensesForDate(companyName, d);
            summary.setBillingBookSales(BigDecimal.ZERO);
            summary.setClosingGpayTotal(BigDecimal.ZERO);
            summary.setPaymentDetailsJson("{\"cards\":[],\"upis\":[]}");
            summary.setDayCloseCleared(true);
            this.accountingDaySummaryRepository.save(summary);
        }
    }
}
