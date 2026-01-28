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
    public AccountingDaySummary upsertSummary(String companyName, LocalDate reportDate, BigDecimal billingBookSales) {
        AccountingDaySummary summary = this.accountingDaySummaryRepository
            .findByCompanyNameAndReportDate(companyName, reportDate)
            .orElseGet(AccountingDaySummary::new);

        summary.setCompanyName(companyName);
        summary.setReportDate(reportDate);
        summary.setBillingBookSales(billingBookSales);

        return this.accountingDaySummaryRepository.save(summary);
    }
}
