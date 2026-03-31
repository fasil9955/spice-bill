package com.spicesshop.billing.service;

import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.repository.AccountingDaySummaryRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountingDaySummaryService {

    @Autowired
    private AccountingDaySummaryRepository accountingDaySummaryRepository;

    public Optional<AccountingDaySummary> getSummary(String companyName, LocalDate reportDate) {
        return this.accountingDaySummaryRepository.findByCompanyNameAndReportDate(companyName, reportDate);
    }

    @Transactional
    public AccountingDaySummary upsertSummary(String companyName, LocalDate reportDate, BigDecimal billingBookSales,
            BigDecimal closingCash, BigDecimal closingGpayTotal, String paymentDetailsJson) {
        AccountingDaySummary summary = this.accountingDaySummaryRepository
            .findByCompanyNameAndReportDate(companyName, reportDate)
            .orElseGet(AccountingDaySummary::new);

        summary.setCompanyName(companyName);
        summary.setReportDate(reportDate);
        summary.setBillingBookSales(billingBookSales != null ? billingBookSales : java.math.BigDecimal.ZERO);
        if (closingCash != null) summary.setClosingCash(closingCash);
        if (closingGpayTotal != null) summary.setClosingGpayTotal(closingGpayTotal);
        if (paymentDetailsJson != null) summary.setPaymentDetailsJson(paymentDetailsJson);

        return this.accountingDaySummaryRepository.save(summary);
    }
}
