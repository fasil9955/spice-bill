package com.spicesshop.billing.controller;

import com.spicesshop.billing.model.B2BCustomer;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.model.InvoiceItem;
import com.spicesshop.billing.model.Product;
import com.spicesshop.billing.repository.B2BCustomerRepository;
import com.spicesshop.billing.service.InvoiceService;
import com.spicesshop.billing.util.CompanyExtractor;
import com.spicesshop.billing.util.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
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

    @Autowired
    private B2BCustomerRepository b2bCustomerRepository;

    @Autowired
    private JwtUtil jwtUtil;

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

    @GetMapping({"/next-invoice-number"})
    public ResponseEntity<?> getNextInvoiceNumber(@RequestParam(required = false) String invoiceType, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            String type = (invoiceType != null && !invoiceType.isEmpty()) ? invoiceType : "RETAIL";
            String nextInvoiceNumber = this.invoiceService.getNextInvoiceNumber(companyName, type);
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
            invoice.setDiscountAmount(toBigDecimal(payload.get("discountAmount")));
            invoice.setCashAmount(toBigDecimal(payload.get("cashAmount")));
            invoice.setCardAmount(toBigDecimal(payload.get("cardAmount")));
            invoice.setUpiAmount(toBigDecimal(payload.get("upiAmount")));
            if (payload.get("cashier") != null && payload.get("cashier") instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> cashierMap = (Map<String, Object>) payload.get("cashier");
                Object userId = cashierMap.get("userId");
                if (userId != null) {
                    com.spicesshop.billing.model.User cashier = new com.spicesshop.billing.model.User();
                    cashier.setUserId(userId instanceof Number ? ((Number) userId).intValue() : Integer.parseInt(userId.toString()));
                    invoice.setCashier(cashier);
                }
            }
            if (invoice.getCashier() == null) {
                String authHeader = request.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    try {
                        Integer userId = this.jwtUtil.extractUserId(authHeader.substring(7));
                        if (userId != null) {
                            com.spicesshop.billing.model.User cashier = new com.spicesshop.billing.model.User();
                            cashier.setUserId(userId);
                            invoice.setCashier(cashier);
                        }
                    } catch (Exception ignored) {}
                }
                if (invoice.getCashier() == null) {
                    throw new RuntimeException("Cashier is required. Please log in again.");
                }
            }
            // RETAIL: invoice number is generated only on save (do not use preview number from payload)
            if ("B2B".equals(invoice.getInvoiceType()) && payload.get("invoiceNumber") != null && !payload.get("invoiceNumber").toString().trim().isEmpty()) {
                invoice.setInvoiceNumber(payload.get("invoiceNumber").toString().trim());
            }
            if (payload.get("ewayBillNumber") != null) {
                String eway = payload.get("ewayBillNumber").toString().trim();
                invoice.setEwayBillNumber(eway.isEmpty() ? null : eway);
            }
            if (payload.get("totalPackages") != null) {
                Object tp = payload.get("totalPackages");
                invoice.setTotalPackages(tp instanceof Number ? ((Number) tp).intValue() : Integer.parseInt(tp.toString()));
            }
            Object b2bCustomerIdObj = payload.get("b2bCustomerId");
            if (b2bCustomerIdObj != null && "B2B".equals(invoice.getInvoiceType())) {
                Integer b2bCustomerId = b2bCustomerIdObj instanceof Number
                    ? ((Number) b2bCustomerIdObj).intValue()
                    : Integer.parseInt(b2bCustomerIdObj.toString());
                B2BCustomer b2bCustomer = this.b2bCustomerRepository.findById(b2bCustomerId)
                    .orElseThrow(() -> new RuntimeException("B2B customer not found"));
                invoice.setB2bCustomer(b2bCustomer);
            }
            List<InvoiceItem> items = mapPayloadToInvoiceItems(payload.get("items"));
            return ResponseEntity.ok(this.invoiceService.createInvoice(invoice, items));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private static BigDecimal toBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        if (val instanceof BigDecimal) return (BigDecimal) val;
        if (val instanceof Number) return BigDecimal.valueOf(((Number) val).doubleValue());
        try {
            return new BigDecimal(val.toString());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    @SuppressWarnings("unchecked")
    private static List<InvoiceItem> mapPayloadToInvoiceItems(Object itemsObj) {
        List<InvoiceItem> result = new ArrayList<>();
        if (itemsObj == null || !(itemsObj instanceof List)) return result;
        List<?> rawList = (List<?>) itemsObj;
        for (Object entry : rawList) {
            if (!(entry instanceof Map)) continue;
            Map<String, Object> map = (Map<String, Object>) entry;
            InvoiceItem item = new InvoiceItem();
            Object productObj = map.get("product");
            if (productObj instanceof Map) {
                Object productIdObj = ((Map<?, ?>) productObj).get("productId");
                if (productIdObj != null) {
                    Product product = new Product();
                    product.setProductId(productIdObj instanceof Number
                        ? ((Number) productIdObj).intValue()
                        : Integer.parseInt(productIdObj.toString()));
                    item.setProduct(product);
                }
            }
            item.setQuantity(toBigDecimal(map.get("quantity")));
            item.setUnitPrice(toBigDecimal(map.get("unitPrice")));
            item.setDiscountAmount(toBigDecimal(map.get("discountAmount")));
            if (map.get("hsnCode") != null && !map.get("hsnCode").toString().trim().isEmpty()) {
                item.setHsnCode(map.get("hsnCode").toString().trim());
            }
            if (map.get("gstPercentage") != null) {
                item.setGstPercentage(toBigDecimal(map.get("gstPercentage")));
            }
            if (item.getProduct() != null) result.add(item);
        }
        return result;
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

    @GetMapping({"/b2b"})
    public ResponseEntity<?> getB2BInvoices(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            return ResponseEntity.ok(this.invoiceService.getB2BInvoices(companyName));
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

    @PutMapping({"/{id}"})
    public ResponseEntity<?> updateInvoice(@PathVariable Integer id, @RequestBody Map<String, Object> payload, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            Invoice updatedInvoice = new Invoice();
            updatedInvoice.setPaymentMethod(Invoice.PaymentMethod.valueOf((String) payload.get("paymentMethod")));
            updatedInvoice.setDiscountAmount(toBigDecimal(payload.get("discountAmount")));
            updatedInvoice.setCashAmount(toBigDecimal(payload.get("cashAmount")));
            updatedInvoice.setCardAmount(toBigDecimal(payload.get("cardAmount")));
            updatedInvoice.setUpiAmount(toBigDecimal(payload.get("upiAmount")));
            if (payload.get("ewayBillNumber") != null) {
                String eway = payload.get("ewayBillNumber").toString().trim();
                updatedInvoice.setEwayBillNumber(eway.isEmpty() ? null : eway);
            }
            if (payload.get("totalPackages") != null) {
                Object tp = payload.get("totalPackages");
                updatedInvoice.setTotalPackages(tp instanceof Number ? ((Number) tp).intValue() : Integer.parseInt(tp.toString()));
            }
            Object b2bCustomerIdObj = payload.get("b2bCustomerId");
            if (b2bCustomerIdObj != null) {
                Integer b2bCustomerId = b2bCustomerIdObj instanceof Number
                    ? ((Number) b2bCustomerIdObj).intValue()
                    : Integer.parseInt(b2bCustomerIdObj.toString());
                B2BCustomer b2bCustomer = this.b2bCustomerRepository.findById(b2bCustomerId).orElse(null);
                if (b2bCustomer != null) updatedInvoice.setB2bCustomer(b2bCustomer);
            }
            List<InvoiceItem> items = mapPayloadToInvoiceItems(payload.get("items"));
            return ResponseEntity.ok(this.invoiceService.updateInvoice(id, updatedInvoice, items, companyName));
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

    @GetMapping({"/cancellation-requests"})
    public ResponseEntity<?> getCancellationRequests(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            return ResponseEntity.ok(this.invoiceService.getCancellationRequests(companyName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/{id}/cancel"})
    public ResponseEntity<?> requestCancel(@PathVariable Integer id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            String reason = body != null && body.containsKey("reason") ? body.get("reason") : "";
            return ResponseEntity.ok(this.invoiceService.requestCancellation(id, reason != null ? reason : "", companyName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/{id}/approve-cancellation"})
    public ResponseEntity<?> approveCancellation(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            this.invoiceService.approveCancellationAndDelete(id, companyName);
            return ResponseEntity.ok(Map.of("message", "Cancellation approved and invoice marked as cancelled"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<?> deleteInvoice(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            this.invoiceService.deleteB2BInvoice(id, companyName);
            return ResponseEntity.ok(Map.of("message", "Invoice marked as cancelled (soft delete)"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/b2b/{id}"})
    public ResponseEntity<?> cancelB2BInvoice(@PathVariable Integer id, @RequestParam(required = false) String reason, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Company name not found in token"));
            }
            this.invoiceService.deleteB2BInvoice(id, companyName, reason);
            return ResponseEntity.ok(Map.of("message", "Invoice marked as cancelled"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
