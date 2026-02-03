package com.spicesshop.billing.service;

import com.spicesshop.billing.model.ExpenseCategory;
import com.spicesshop.billing.repository.ExpenseCategoryRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseCategoryService {

    @Autowired
    private ExpenseCategoryRepository expenseCategoryRepository;

    public List<ExpenseCategory> getCategories(String companyName) {
        return expenseCategoryRepository.findByCompanyNameOrderByNameAsc(companyName);
    }

    @Transactional
    public ExpenseCategory create(String companyName, String name) {
        if (name == null || name.isBlank()) {
            throw new RuntimeException("Category name is required");
        }
        String trimmed = name.trim();
        if (expenseCategoryRepository.existsByCompanyNameAndNameIgnoreCase(companyName, trimmed)) {
            throw new RuntimeException("Category already exists: " + trimmed);
        }
        ExpenseCategory cat = new ExpenseCategory();
        cat.setCompanyName(companyName);
        cat.setName(trimmed);
        return expenseCategoryRepository.save(cat);
    }

    @Transactional
    public void delete(String companyName, Integer id) {
        ExpenseCategory cat = expenseCategoryRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Category not found"));
        if (!cat.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Category not found or access denied");
        }
        expenseCategoryRepository.delete(cat);
    }
}
