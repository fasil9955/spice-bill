package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.ExpenseRequest;
import com.spicesshop.billing.model.Employee;
import com.spicesshop.billing.model.ExpenseRecord;
import com.spicesshop.billing.repository.EmployeeRepository;
import com.spicesshop.billing.repository.ExpenseRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseService {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    public List<ExpenseRecord> getExpensesByDate(String companyName, String date) {
        LocalDate expenseDate = (date != null && !date.isBlank()) ? LocalDate.parse(date) : LocalDate.now();
        return this.expenseRepository.findByCompanyNameAndExpenseDateOrderByCreatedAtDesc(companyName, expenseDate);
    }

    public List<ExpenseRecord> getEmployeeExpenses(String companyName, Integer employeeId) {
        if (employeeId == null) {
            throw new RuntimeException("Employee is required");
        }

        Employee employee = this.employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found"));
        
        if (!employee.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Employee not found or access denied");
        }
        return this.expenseRepository.findByCompanyNameAndAccountTypeAndEmployeeIdOrderByCreatedAtDesc(companyName, "EMPLOYEE", employeeId);
    }

    @Transactional
    public ExpenseRecord createExpense(String companyName, ExpenseRequest request) {
        if (request == null) {
            throw new RuntimeException("Invalid expense data");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }

        ExpenseRecord record = new ExpenseRecord();
        record.setCompanyName(companyName);
        record.setAccountType((request.getAccountType() != null) ? request.getAccountType() : "OTHER");
        record.setEmployeeId(request.getEmployeeId());
        record.setOtherName(request.getOtherName());
        record.setAmount(request.getAmount());
        record.setPaymentMethod((request.getPaymentMethod() != null) ? request.getPaymentMethod() : "CASH");
        
        if (request.getExpenseDate() != null && !request.getExpenseDate().isBlank()) {
            record.setExpenseDate(LocalDate.parse(request.getExpenseDate()));
        }

        if ("EMPLOYEE".equalsIgnoreCase(record.getAccountType())) {
            if (record.getEmployeeId() == null) {
                throw new RuntimeException("Employee is required");
            }

            Employee employee = this.employeeRepository.findById(record.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));
            
            if (!employee.getCompanyName().equals(companyName)) {
                throw new RuntimeException("Employee not found or access denied");
            }
        } else if (record.getOtherName() == null || record.getOtherName().isBlank()) {
            throw new RuntimeException("Expense name is required");
        }

        return this.expenseRepository.save(record);
    }

    @Transactional
    public void deleteExpense(String companyName, Integer expenseId) {
        ExpenseRecord record = this.expenseRepository.findById(expenseId)
            .orElseThrow(() -> new RuntimeException("Expense not found"));
        
        if (!record.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Expense not found or access denied");
        }
        this.expenseRepository.delete(record);
    }

    @Transactional
    public ExpenseRecord updateExpense(String companyName, Integer expenseId, ExpenseRequest request) {
        ExpenseRecord record = this.expenseRepository.findById(expenseId)
            .orElseThrow(() -> new RuntimeException("Expense not found"));

        if (!record.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Expense not found or access denied");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }

        record.setAccountType((request.getAccountType() != null) ? request.getAccountType() : "OTHER");
        record.setEmployeeId(request.getEmployeeId());
        record.setOtherName(request.getOtherName());
        record.setAmount(request.getAmount());
        record.setPaymentMethod((request.getPaymentMethod() != null) ? request.getPaymentMethod() : "CASH");

        if (request.getExpenseDate() != null && !request.getExpenseDate().isBlank()) {
            record.setExpenseDate(LocalDate.parse(request.getExpenseDate()));
        }

        if ("EMPLOYEE".equalsIgnoreCase(record.getAccountType())) {
            if (record.getEmployeeId() == null) {
                throw new RuntimeException("Employee is required");
            }

            Employee employee = this.employeeRepository.findById(record.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));
            
            if (!employee.getCompanyName().equals(companyName)) {
                throw new RuntimeException("Employee not found or access denied");
            }
        } else if (record.getOtherName() == null || record.getOtherName().isBlank()) {
            throw new RuntimeException("Expense name is required");
        }

        return this.expenseRepository.save(record);
    }
}
