package com.spicesshop.billing.controller;

import com.spicesshop.billing.dto.EmployeeAdvanceRequest;
import com.spicesshop.billing.dto.EmployeePaymentRequest;
import com.spicesshop.billing.dto.EmployeeSalaryClearanceRequest;
import com.spicesshop.billing.service.EmployeeAccountService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/employee-accounts"})
@CrossOrigin(origins = {"*"})
public class EmployeeAccountController {

    @Autowired
    private EmployeeAccountService employeeAccountService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping({"/advances/{employeeId}"})
    public ResponseEntity<?> getAdvances(@PathVariable Integer employeeId, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.employeeAccountService.getAdvances(companyName, employeeId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/advances"})
    public ResponseEntity<?> createAdvance(@RequestBody EmployeeAdvanceRequest advanceRequest, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.employeeAccountService.createAdvance(companyName, advanceRequest));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/advances/{advanceId}"})
    public ResponseEntity<?> deleteAdvance(@PathVariable Integer advanceId, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            this.employeeAccountService.deleteAdvance(companyName, advanceId);
            return ResponseEntity.ok(Map.of("message", "Advance deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/salary-clearances/{employeeId}"})
    public ResponseEntity<?> getSalaryClearances(@PathVariable Integer employeeId, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.employeeAccountService.getSalaryClearances(companyName, employeeId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/clear-salary"})
    public ResponseEntity<?> clearSalary(@RequestBody EmployeeSalaryClearanceRequest clearanceRequest, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.employeeAccountService.clearSalary(companyName, clearanceRequest));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/payments/{employeeId}"})
    public ResponseEntity<?> getPayments(@PathVariable Integer employeeId, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.employeeAccountService.getPayments(companyName, employeeId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/payments"})
    public ResponseEntity<?> addPayment(@RequestBody EmployeePaymentRequest paymentRequest, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.employeeAccountService.addPayment(companyName, paymentRequest));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/payments/{paymentId}"})
    public ResponseEntity<?> deletePayment(@PathVariable Integer paymentId, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            this.employeeAccountService.deletePayment(companyName, paymentId);
            return ResponseEntity.ok(Map.of("message", "Payment deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
