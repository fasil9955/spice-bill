package com.spicesshop.billing.controller;

import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.model.InvoiceItem;
import com.spicesshop.billing.service.InvoiceService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/invoices"})
@CrossOrigin(origins = {"*"})
public class InvoiceController {

    @Autowired
    private InvoiceService invoiceService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping({"/b2b/next-invoice-number"})
    public ResponseEntity<?> getNextB2BInvoiceNumber(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            String nextInvoiceNumber = this.invoiceService.generateNextB2BInvoiceNumber(companyName);
            return ResponseEntity.ok(Map.of("invoiceNumber", nextInvoiceNumber));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createInvoice(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            Invoice invoice = new Invoice();
            invoice.setInvoiceType((String) payload.get("invoiceType"));
            invoice.setPaymentMethod(Invoice.PaymentMethod.valueOf((String) payload.get("paymentMethod")));
            
            // Map other fields from payload to invoice object
            // This is a simplified version, ideally use a DTO
            
            List<InvoiceItem> items = (List<InvoiceItem>) payload.get("items");
            return ResponseEntity.ok(this.invoiceService.createInvoice(invoice, items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllInvoices(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.invoiceService.getAllInvoices(companyName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/{id}"})
    public ResponseEntity<?> getInvoiceById(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return this.invoiceService.getInvoiceById(id, companyName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/date"})
    public ResponseEntity<?> getInvoicesByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.invoiceService.getInvoicesByDate(date, companyName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<?> deleteInvoice(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            this.invoiceService.deleteB2BInvoice(id, companyName);
            return ResponseEntity.ok(Map.of("message", "Invoice deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
