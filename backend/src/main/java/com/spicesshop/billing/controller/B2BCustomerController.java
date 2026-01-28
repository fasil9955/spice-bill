package com.spicesshop.billing.controller;

import com.spicesshop.billing.model.B2BCustomer;
import com.spicesshop.billing.repository.B2BCustomerRepository;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/b2b-customers"})
@CrossOrigin(origins = {"*"})
public class B2BCustomerController {

    @Autowired
    private B2BCustomerRepository b2bCustomerRepository;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping({"/search"})
    public ResponseEntity<?> searchCustomers(@RequestParam(required = false) String query, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            List<B2BCustomer> customers;
            if (query == null || query.trim().isEmpty()) {
                customers = this.b2bCustomerRepository.findByCompanyName(companyName);
            } else {
                customers = this.b2bCustomerRepository.findByCompanyNameContainingIgnoreCase(query);
            }
            return ResponseEntity.ok(customers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllCustomers(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            List<B2BCustomer> customers = this.b2bCustomerRepository.findByCompanyName(companyName);
            return ResponseEntity.ok(customers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/{id}"})
    public ResponseEntity<?> getCustomerById(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            Optional<B2BCustomer> customer = this.b2bCustomerRepository.findById(id);
            if (customer.isPresent() && customer.get().getCompanyName().equals(companyName)) {
                return ResponseEntity.ok(customer.get());
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createCustomer(@RequestBody B2BCustomer customer, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            customer.setCompanyName(companyName);
            B2BCustomer saved = this.b2bCustomerRepository.save(customer);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
