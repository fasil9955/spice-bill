package com.spicesshop.billing.controller;

import com.spicesshop.billing.model.ExpenseCategory;
import com.spicesshop.billing.service.ExpenseCategoryService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/expense-categories")
@CrossOrigin(origins = "*")
public class ExpenseCategoryController {

    @Autowired
    private ExpenseCategoryService expenseCategoryService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping
    public ResponseEntity<?> getAll(HttpServletRequest request) {
        try {
            String companyName = companyExtractor.extractCompanyFromRequest(request);
            List<ExpenseCategory> list = expenseCategoryService.getCategories(companyName);
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, String> body, HttpServletRequest request) {
        try {
            String companyName = companyExtractor.extractCompanyFromRequest(request);
            String name = body != null ? body.get("name") : null;
            ExpenseCategory created = expenseCategoryService.create(companyName, name);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = companyExtractor.extractCompanyFromRequest(request);
            expenseCategoryService.delete(companyName, id);
            return ResponseEntity.ok(Map.of("message", "Category deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
