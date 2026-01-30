package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.ExpenseCategory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ExpenseCategoryRepository extends JpaRepository<ExpenseCategory, Integer> {
    List<ExpenseCategory> findByCompanyNameOrderByNameAsc(String companyName);
    boolean existsByCompanyNameAndNameIgnoreCase(String companyName, String name);
}
