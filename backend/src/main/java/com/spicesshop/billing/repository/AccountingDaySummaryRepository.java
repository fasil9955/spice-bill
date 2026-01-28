package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.AccountingDaySummary;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountingDaySummaryRepository extends JpaRepository<AccountingDaySummary, Long> {
    Optional<AccountingDaySummary> findByCompanyNameAndReportDate(String companyName, LocalDate reportDate);
}
