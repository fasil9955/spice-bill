package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.ExpenseRecord;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseRepository extends JpaRepository<ExpenseRecord, Integer> {
    List<ExpenseRecord> findByCompanyNameAndExpenseDateOrderByCreatedAtDesc(String companyName, LocalDate expenseDate);
    
    List<ExpenseRecord> findByCompanyNameAndAccountTypeAndEmployeeIdOrderByCreatedAtDesc(String companyName, String accountType, Integer employeeId);
}
