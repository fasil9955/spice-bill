package com.spicesshop.billing.controller;

import com.spicesshop.billing.dto.ExpenseRequest;
import com.spicesshop.billing.model.ExpenseRecord;
import com.spicesshop.billing.service.ExpenseService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/expenses"})
@CrossOrigin(origins = {"*"})
public class ExpenseController {

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping
    public ResponseEntity<?> getExpensesByDate(@RequestParam(required = false) String date, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            List<ExpenseRecord> expenses = this.expenseService.getExpensesByDate(companyName, date);
            return ResponseEntity.ok(expenses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/employee"})
    public ResponseEntity<?> getEmployeeExpenses(@RequestParam Integer employeeId, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            List<ExpenseRecord> expenses = this.expenseService.getEmployeeExpenses(companyName, employeeId);
            return ResponseEntity.ok(expenses);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createExpense(@RequestBody ExpenseRequest requestBody, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            ExpenseRecord created = this.expenseService.createExpense(companyName, requestBody);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<?> deleteExpense(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            this.expenseService.deleteExpense(companyName, id);
            return ResponseEntity.ok(Map.of("message", "Expense deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping({"/{id}"})
    public ResponseEntity<?> updateExpense(@PathVariable Integer id, @RequestBody ExpenseRequest requestBody, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            ExpenseRecord updated = this.expenseService.updateExpense(companyName, id, requestBody);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
