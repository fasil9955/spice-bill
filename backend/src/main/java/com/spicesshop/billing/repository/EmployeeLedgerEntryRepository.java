package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.EmployeeLedgerEntry;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeLedgerEntryRepository extends JpaRepository<EmployeeLedgerEntry, Integer> {

    List<EmployeeLedgerEntry> findByCompanyNameAndEmployeeIdOrderByEntryDateAscCreatedAtAsc(String companyName, Integer employeeId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM EmployeeLedgerEntry e WHERE e.companyName = :companyName AND e.employeeId = :employeeId AND e.entryType = 'ADVANCE' AND e.entryDate BETWEEN :startDate AND :endDate")
    BigDecimal sumAdvanceAmountBetween(
        @Param("companyName") String companyName,
        @Param("employeeId") Integer employeeId,
        @Param("startDate") LocalDate startDate,
        @Param("endDate") LocalDate endDate
    );
}
