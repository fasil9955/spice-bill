package com.spicesshop.billing.controller;

import com.spicesshop.billing.model.B2BCustomer;
import com.spicesshop.billing.repository.B2BCustomerRepository;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
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
            if (companyName == null || companyName.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please log in again."));
            }
            List<B2BCustomer> customers;
            String q = (query != null) ? query.trim() : "";
            if (q.isEmpty()) {
                customers = this.b2bCustomerRepository.findByCompanyNameOrUnassigned(companyName);
            } else {
                customers = this.b2bCustomerRepository.findByCompanyNameOrUnassignedAndSearchQuery(companyName, q);
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
            if (companyName == null || companyName.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please log in again."));
            }
            List<B2BCustomer> customers = this.b2bCustomerRepository.findByCompanyNameOrUnassigned(companyName);
            return ResponseEntity.ok(customers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/{id}"})
    public ResponseEntity<?> getCustomerById(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null || companyName.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please log in again."));
            }
            Optional<B2BCustomer> customer = this.b2bCustomerRepository.findById(id);
            if (customer.isPresent()) {
                String custCompany = customer.get().getCompanyName();
                if (companyName.equals(custCompany) || custCompany == null || custCompany.isBlank()) {
                    return ResponseEntity.ok(customer.get());
                }
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
            if (companyName == null || companyName.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please log in again."));
            }
            customer.setCompanyName(companyName);
            B2BCustomer saved = this.b2bCustomerRepository.save(customer);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping({"/{id}"})
    public ResponseEntity<?> updateCustomer(@PathVariable Integer id, @RequestBody B2BCustomer body, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null || companyName.isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized. Please log in again."));
            }
            Optional<B2BCustomer> existing = this.b2bCustomerRepository.findById(id);
            B2BCustomer existingCustomer = existing.orElse(null);
            if (existingCustomer == null) {
                return ResponseEntity.notFound().build();
            }
            String custCompany = existingCustomer.getCompanyName();
            if (!companyName.equals(custCompany) && custCompany != null && !custCompany.isBlank()) {
                return ResponseEntity.notFound().build();
            }
            // Assign direct-DB-insert customers to this company when they're updated
            if (custCompany == null || custCompany.isBlank()) {
                existingCustomer.setCompanyName(companyName);
            }
            if (body.getCustomerName() != null) existingCustomer.setCustomerName(body.getCustomerName());
            if (body.getGstNumber() != null) existingCustomer.setGstNumber(body.getGstNumber());
            if (body.getBillingAddress() != null) existingCustomer.setBillingAddress(body.getBillingAddress());
            if (body.getShippingAddress() != null) existingCustomer.setShippingAddress(body.getShippingAddress());
            if (body.getAddress() != null) existingCustomer.setAddress(body.getAddress());
            if (body.getPhone() != null) existingCustomer.setPhone(body.getPhone());
            if (body.getEmail() != null) existingCustomer.setEmail(body.getEmail());
            if (body.getCompanyNameInInvoice() != null) existingCustomer.setCompanyNameInInvoice(body.getCompanyNameInInvoice());
            existingCustomer.setUpdatedAt(java.time.LocalDateTime.now());
            B2BCustomer updated = this.b2bCustomerRepository.save(existingCustomer);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
