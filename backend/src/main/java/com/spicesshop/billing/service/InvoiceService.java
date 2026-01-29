package com.spicesshop.billing.service;

import com.spicesshop.billing.model.*;
import com.spicesshop.billing.repository.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private InvoiceItemRepository invoiceItemRepository;

    @Autowired
    private B2BCustomerRepository b2bCustomerRepository;

    @Autowired
    private InvoiceSequenceRepository invoiceSequenceRepository;

    /** Returns the next invoice number (reserves it for RETAIL). Used for preview-before-save. */
    @Transactional
    public String getNextInvoiceNumber(String companyName, String invoiceType) {
        return generateInvoiceNumber(companyName, invoiceType != null ? invoiceType : "RETAIL");
    }

    @Transactional
    private String generateInvoiceNumber(String companyName, String invoiceType) {
        if ("B2B".equals(invoiceType)) {
            return generateNextB2BInvoiceNumber(companyName);
        }

        LocalDate today = LocalDate.now();
        String datePart = today.format(DateTimeFormatter.ofPattern("yyyy-MMdd"));

        InvoiceSequence sequence = this.invoiceSequenceRepository.findByCompanyNameAndDateForUpdate(companyName, today)
            .orElseGet(() -> {
                InvoiceSequence newSeq = new InvoiceSequence(companyName, today);
                newSeq.setNextSequence(1);
                return newSeq;
            });

        int seqNum = sequence.getNextSequence();
        sequence.setNextSequence(seqNum + 1);
        this.invoiceSequenceRepository.save(sequence);

        return String.format("INV-%s-%04d", datePart, seqNum);
    }

    public String generateNextB2BInvoiceNumber(String companyName) {
        Integer maxSeq = this.invoiceRepository.findMaxB2BInvoiceSequence(companyName);
        int nextSeq = 1000;
        if (maxSeq != null) {
            nextSeq = Math.max(1000, maxSeq + 1);
        }

        Integer configuredStart = this.userRepository.findByCompanyNameAndRole(companyName, User.Role.ADMIN)
            .map(User::getB2bInvoiceStart).orElse(null);
        
        if (configuredStart != null && configuredStart > 0) {
            if (maxSeq == null) {
                nextSeq = Math.max(nextSeq, configuredStart);
            } else {
                nextSeq = Math.max(nextSeq, Math.max(configuredStart, maxSeq + 1));
            }
        }

        return String.valueOf(nextSeq);
    }

    private List<InvoiceItem> normalizeInvoiceItems(List<InvoiceItem> items) {
        if (items == null || items.isEmpty()) {
            return List.of();
        }
        Map<String, InvoiceItem> normalized = new LinkedHashMap<>();
        for (InvoiceItem item : items) {
            if (item.getProduct() == null || item.getProduct().getProductId() == null || item.getUnitPrice() == null) {
                continue;
            }
            String key = item.getProduct().getProductId().toString();
            InvoiceItem existing = normalized.get(key);
            BigDecimal quantity = (item.getQuantity() != null) ? item.getQuantity() : BigDecimal.ZERO;
            BigDecimal discountAmount = (item.getDiscountAmount() != null) ? item.getDiscountAmount() : BigDecimal.ZERO;
            
            if (existing == null) {
                InvoiceItem copy = new InvoiceItem();
                Product product = new Product();
                product.setProductId(item.getProduct().getProductId());
                copy.setProduct(product);
                copy.setQuantity(quantity);
                copy.setUnitPrice(item.getUnitPrice());
                copy.setDiscountAmount(discountAmount);
                copy.setHsnCode(item.getHsnCode());
                normalized.put(key, copy);
            } else {
                existing.setQuantity(existing.getQuantity().add(quantity));
                existing.setDiscountAmount(existing.getDiscountAmount().add(discountAmount));
            }
        }
        return new ArrayList<>(normalized.values());
    }

    @Transactional
    public Invoice createInvoice(Invoice invoice, List<InvoiceItem> items) {
        User cashier = this.userRepository.findById(invoice.getCashier().getUserId())
            .orElseThrow(() -> new RuntimeException("Cashier not found"));
        invoice.setCashier(cashier);

        String companyName = cashier.getCompanyName();

        if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().trim().isEmpty()) {
            invoice.setInvoiceNumber(generateInvoiceNumber(companyName, invoice.getInvoiceType()));
        } else {
            Optional<Invoice> existingInvoice = this.invoiceRepository.findByInvoiceNumber(invoice.getInvoiceNumber());
            if (existingInvoice.isPresent()) {
                throw new RuntimeException("Invoice number " + invoice.getInvoiceNumber() + " already exists");
            }
        }

        List<InvoiceItem> normalizedItems = normalizeInvoiceItems(items);

        BigDecimal sumOfItemTotals = normalizedItems.stream().map(item -> {
            Product product = this.productRepository.findById(item.getProduct().getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));
            
            if (!product.getCompanyName().equals(companyName)) {
                throw new RuntimeException("Product does not belong to your company");
            }
            BigDecimal itemTotal = item.getQuantity().multiply(item.getUnitPrice());
            return itemTotal.subtract(item.getDiscountAmount());
        }).reduce(BigDecimal.ZERO, BigDecimal::add);

        for (InvoiceItem item : normalizedItems) {
            Product product = this.productRepository.findById(item.getProduct().getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found: " + item.getProduct().getProductId()));

            if (!product.getCompanyName().equals(companyName)) {
                throw new RuntimeException("Product does not belong to your company");
            }

            item.setProduct(product);
            item.setProductName(product.getProductName());
            item.setBarcode(product.getBarcode());
            item.setUnit(product.getUnit());
            if (item.getHsnCode() == null || item.getHsnCode().trim().isEmpty()) {
                item.setHsnCode(product.getHsnCode());
            }

            BigDecimal itemTotal = item.getQuantity().multiply(item.getUnitPrice());
            itemTotal = itemTotal.subtract(item.getDiscountAmount());
            item.setTotalPrice(itemTotal);

            // GST: use item's gstPercentage if already set (e.g. from B2B payload), else category
            BigDecimal gstPct = item.getGstPercentage() != null && item.getGstPercentage().compareTo(BigDecimal.ZERO) >= 0
                ? item.getGstPercentage()
                : (product.getCategory() != null ? product.getCategory().getGstPercentage() : null);
            if (gstPct == null) gstPct = BigDecimal.ZERO;
            item.setGstPercentage(gstPct);
            if (gstPct.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal onePlusGst = BigDecimal.ONE.add(gstPct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
                BigDecimal taxableValue = itemTotal.divide(onePlusGst, 2, RoundingMode.HALF_UP);
                BigDecimal gstAmount = itemTotal.subtract(taxableValue);
                BigDecimal halfGst = gstAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                item.setCgstAmount(halfGst);
                item.setSgstAmount(halfGst);
            } else {
                item.setCgstAmount(BigDecimal.ZERO);
                item.setSgstAmount(BigDecimal.ZERO);
            }

            BigDecimal newQuantity = product.getQuantity().subtract(item.getQuantity());
            if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("Insufficient stock for product: " + product.getProductName());
            }
            product.setQuantity(newQuantity);
            this.productRepository.save(product);

            item.setInvoice(invoice);
        }

        // Sum CGST and SGST for invoice totals
        BigDecimal totalCgst = normalizedItems.stream()
            .map(i -> i.getCgstAmount() != null ? i.getCgstAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSgst = normalizedItems.stream()
            .map(i -> i.getSgstAmount() != null ? i.getSgstAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        invoice.setCgstAmount(totalCgst);
        invoice.setSgstAmount(totalSgst);
        invoice.setTaxAmount(totalCgst.add(totalSgst));

        // Subtotal = sum of items minus GST (same as billing page: taxable base)
        BigDecimal subtotalBeforeTax = sumOfItemTotals.subtract(totalCgst).subtract(totalSgst);
        invoice.setSubtotal(subtotalBeforeTax);

        if ("B2B".equals(invoice.getInvoiceType())) {
            invoice.setTotalAmount(subtotalBeforeTax.add(invoice.getTaxAmount()).subtract(invoice.getDiscountAmount()));
        } else {
            invoice.setTotalAmount(sumOfItemTotals.subtract(invoice.getDiscountAmount()));
        }

        invoice.setItems(normalizedItems);
        return this.invoiceRepository.save(invoice);
    }

    public List<Invoice> getAllInvoices(String companyName) {
        return this.invoiceRepository.findAll().stream()
            .filter(inv -> inv.getCashier().getCompanyName().equals(companyName))
            .toList();
    }

    public Optional<Invoice> getInvoiceById(Integer id, String companyName) {
        Optional<Invoice> invoice = this.invoiceRepository.findById(id);
        if (invoice.isPresent() && invoice.get().getCashier().getCompanyName().equals(companyName)) {
            return invoice;
        }
        return Optional.empty();
    }

    public Optional<Invoice> getInvoiceByNumber(String invoiceNumber, String companyName) {
        Optional<Invoice> invoice = this.invoiceRepository.findByInvoiceNumber(invoiceNumber);
        if (invoice.isPresent() && invoice.get().getCashier().getCompanyName().equals(companyName)) {
            return invoice;
        }
        return Optional.empty();
    }

    public List<Invoice> getInvoicesByDate(LocalDate date, String companyName) {
        return this.invoiceRepository.findByCompanyNameAndDate(companyName, date);
    }

    public List<Invoice> getInvoicesByDateRange(LocalDateTime startDate, LocalDateTime endDate, String companyName) {
        return this.invoiceRepository.findByCompanyNameAndDateRange(companyName, startDate, endDate);
    }

    public List<Invoice> getInvoicesByCashier(Integer cashierId, String companyName) {
        return this.invoiceRepository.findByCashier_UserId(cashierId).stream()
            .filter(inv -> inv.getCashier().getCompanyName().equals(companyName))
            .toList();
    }

    public List<Invoice> getB2BInvoices(String companyName) {
        return this.invoiceRepository.findB2BInvoicesByCompany(companyName);
    }

    public List<Invoice> getB2BInvoicesByDateRange(LocalDateTime startDate, LocalDateTime endDate, String companyName) {
        return this.invoiceRepository.findB2BInvoicesByCompanyAndDateRange(companyName, startDate, endDate);
    }

    @Transactional
    public Invoice updateInvoice(Integer invoiceId, Invoice updatedInvoice, List<InvoiceItem> items, String companyName) {
        Invoice existingInvoice = getInvoiceById(invoiceId, companyName)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (existingInvoice.getStatus() != Invoice.InvoiceStatus.ACTIVE) {
            throw new RuntimeException("Cannot edit invoice with status: " + existingInvoice.getStatus());
        }

        if (existingInvoice.getItems() != null) {
            for (InvoiceItem oldItem : existingInvoice.getItems()) {
                Product product = this.productRepository.findById(oldItem.getProduct().getProductId()).orElse(null);
                if (product != null) {
                    product.setQuantity(product.getQuantity().add(oldItem.getQuantity()));
                    this.productRepository.save(product);
                }
            }
        }

        if (existingInvoice.getItems() != null && !existingInvoice.getItems().isEmpty()) {
            List<InvoiceItem> toDelete = new ArrayList<>(existingInvoice.getItems());
            existingInvoice.getItems().clear();
            this.invoiceItemRepository.deleteAll(toDelete);
            this.invoiceItemRepository.flush();
        } else if (existingInvoice.getItems() == null) {
            existingInvoice.setItems(new ArrayList<>());
        }

        existingInvoice.setSubtotal(updatedInvoice.getSubtotal());
        existingInvoice.setTaxAmount(updatedInvoice.getTaxAmount());
        existingInvoice.setDiscountAmount(updatedInvoice.getDiscountAmount());
        existingInvoice.setTotalAmount(updatedInvoice.getTotalAmount());
        existingInvoice.setPaymentMethod(updatedInvoice.getPaymentMethod());
        existingInvoice.setCashAmount(updatedInvoice.getCashAmount());
        existingInvoice.setCardAmount(updatedInvoice.getCardAmount());
        existingInvoice.setUpiAmount(updatedInvoice.getUpiAmount());

        if (updatedInvoice.getEwayBillNumber() != null) {
            existingInvoice.setEwayBillNumber(updatedInvoice.getEwayBillNumber());
        }

        if (updatedInvoice.getB2bCustomer() != null) {
            B2BCustomer updatedCust = updatedInvoice.getB2bCustomer();
            B2BCustomer b2bCustomer = findOrCreateB2BCustomer(
                updatedCust.getCustomerName(), 
                updatedCust.getGstNumber(), 
                updatedCust.getBillingAddress(), 
                updatedCust.getShippingAddress(), 
                updatedCust.getPhone(), 
                updatedCust.getEmail()
            );
            existingInvoice.setB2bCustomer(b2bCustomer);
        }

        List<InvoiceItem> normalizedItems = normalizeInvoiceItems(items);

        for (InvoiceItem item : normalizedItems) {
            Product product = this.productRepository.findById(item.getProduct().getProductId())
                .orElseThrow(() -> new RuntimeException("Product not found"));
            
            if (!product.getCompanyName().equals(companyName)) {
                throw new RuntimeException("Product does not belong to your company");
            }

            item.setProduct(product);
            item.setProductName(product.getProductName());
            item.setBarcode(product.getBarcode());
            item.setUnit(product.getUnit());
            if (item.getHsnCode() == null || item.getHsnCode().trim().isEmpty()) {
                item.setHsnCode(product.getHsnCode());
            }

            BigDecimal itemTotal = item.getQuantity().multiply(item.getUnitPrice());
            itemTotal = itemTotal.subtract(item.getDiscountAmount());
            item.setTotalPrice(itemTotal);

            BigDecimal gstPct = product.getCategory() != null ? product.getCategory().getGstPercentage() : null;
            if (gstPct != null && gstPct.compareTo(BigDecimal.ZERO) > 0) {
                item.setGstPercentage(gstPct);
                BigDecimal onePlusGst = BigDecimal.ONE.add(gstPct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
                BigDecimal taxableValue = itemTotal.divide(onePlusGst, 2, RoundingMode.HALF_UP);
                BigDecimal gstAmount = itemTotal.subtract(taxableValue);
                BigDecimal halfGst = gstAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                item.setCgstAmount(halfGst);
                item.setSgstAmount(halfGst);
            } else {
                item.setGstPercentage(gstPct != null ? gstPct : BigDecimal.ZERO);
                item.setCgstAmount(BigDecimal.ZERO);
                item.setSgstAmount(BigDecimal.ZERO);
            }

            BigDecimal newQuantity = product.getQuantity().subtract(item.getQuantity());
            if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("Insufficient stock for product: " + product.getProductName());
            }
            product.setQuantity(newQuantity);
            this.productRepository.save(product);

            item.setInvoice(existingInvoice);
            existingInvoice.getItems().add(item);
        }

        BigDecimal sumItemTotals = existingInvoice.getItems().stream()
            .map(i -> i.getTotalPrice() != null ? i.getTotalPrice() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCgst = existingInvoice.getItems().stream()
            .map(i -> i.getCgstAmount() != null ? i.getCgstAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalSgst = existingInvoice.getItems().stream()
            .map(i -> i.getSgstAmount() != null ? i.getSgstAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal subtotalBeforeTax = sumItemTotals.subtract(totalCgst).subtract(totalSgst);
        existingInvoice.setSubtotal(subtotalBeforeTax);
        existingInvoice.setCgstAmount(totalCgst);
        existingInvoice.setSgstAmount(totalSgst);
        existingInvoice.setTaxAmount(totalCgst.add(totalSgst));
        existingInvoice.setTotalAmount(sumItemTotals.subtract(existingInvoice.getDiscountAmount() != null ? existingInvoice.getDiscountAmount() : BigDecimal.ZERO));

        return this.invoiceRepository.save(existingInvoice);
    }

    @Transactional
    public void deleteB2BInvoice(Integer invoiceId, String companyName) {
        Invoice invoice = getInvoiceById(invoiceId, companyName)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));
        
        if (!"B2B".equals(invoice.getInvoiceType())) {
            throw new RuntimeException("Only B2B invoices can be deleted from this report");
        }

        for (InvoiceItem item : invoice.getItems()) {
            Product product = this.productRepository.findById(item.getProduct().getProductId()).orElse(null);
            if (product != null) {
                product.setQuantity(product.getQuantity().add(item.getQuantity()));
                this.productRepository.save(product);
            }
        }
        this.invoiceRepository.delete(invoice);
    }

    @Transactional
    public Invoice requestCancellation(Integer invoiceId, String reason, String companyName) {
        Invoice invoice = getInvoiceById(invoiceId, companyName)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (invoice.getStatus() != Invoice.InvoiceStatus.ACTIVE) {
            throw new RuntimeException("Invoice cannot be cancelled. Current status: " + invoice.getStatus());
        }

        invoice.setStatus(Invoice.InvoiceStatus.CANCELLATION_REQUESTED);
        invoice.setCancellationRequestedAt(LocalDateTime.now());
        invoice.setCancellationReason(reason);

        return this.invoiceRepository.save(invoice);
    }

    public List<Invoice> getCancellationRequests(String companyName) {
        return this.invoiceRepository.findByStatus(Invoice.InvoiceStatus.CANCELLATION_REQUESTED).stream()
            .filter(inv -> inv.getCashier().getCompanyName().equals(companyName))
            .toList();
    }

    @Transactional
    public void approveCancellationAndDelete(Integer invoiceId, String companyName) {
        Invoice invoice = getInvoiceById(invoiceId, companyName)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (invoice.getStatus() != Invoice.InvoiceStatus.CANCELLATION_REQUESTED) {
            throw new RuntimeException("Invoice is not pending cancellation");
        }

        for (InvoiceItem item : invoice.getItems()) {
            Product product = this.productRepository.findById(item.getProduct().getProductId()).orElse(null);
            if (product != null) {
                product.setQuantity(product.getQuantity().add(item.getQuantity()));
                this.productRepository.save(product);
            }
        }

        this.invoiceRepository.delete(invoice);
    }

    public List<Invoice> getMonthlyInvoices(String companyName, int year, int month) {
        LocalDateTime startDate = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime endDate = startDate.plusMonths(1).minusSeconds(1);
        return getInvoicesByDateRange(startDate, endDate, companyName);
    }

    @Transactional
    public B2BCustomer findOrCreateB2BCustomer(String customerName, String gstNumber, String billingAddress, String shippingAddress, String phone, String email) {
        if (gstNumber == null || gstNumber.trim().isEmpty()) {
            throw new RuntimeException("GST number is required for B2B customers");
        }

        Optional<B2BCustomer> existingCustomer = this.b2bCustomerRepository.findByGstNumber(gstNumber.trim());

        if (existingCustomer.isPresent()) {
            B2BCustomer customer = existingCustomer.get();
            boolean updated = false;
            if (customerName != null && !customerName.trim().isEmpty()) {
                customer.setCustomerName(customerName.trim());
                customer.setCompanyName(customerName.trim());
                updated = true;
            }
            if (billingAddress != null && !billingAddress.trim().isEmpty()) {
                customer.setBillingAddress(billingAddress.trim());
                customer.setAddress(billingAddress.trim());
                updated = true;
            }
            if (shippingAddress != null && !shippingAddress.trim().isEmpty()) {
                customer.setShippingAddress(shippingAddress.trim());
                updated = true;
            }
            if (phone != null && !phone.trim().isEmpty()) {
                customer.setPhone(phone.trim());
                updated = true;
            }
            if (email != null && !email.trim().isEmpty()) {
                customer.setEmail(email.trim());
                updated = true;
            }
            return updated ? this.b2bCustomerRepository.save(customer) : customer;
        }

        B2BCustomer newCustomer = new B2BCustomer();
        newCustomer.setCompanyName((customerName != null) ? customerName.trim() : "Unknown");
        newCustomer.setCustomerName((customerName != null) ? customerName.trim() : "Unknown");
        newCustomer.setGstNumber(gstNumber.trim());
        newCustomer.setBillingAddress(billingAddress != null ? billingAddress.trim() : null);
        newCustomer.setAddress(billingAddress != null ? billingAddress.trim() : null);
        newCustomer.setShippingAddress(shippingAddress != null ? shippingAddress.trim() : null);
        newCustomer.setPhone(phone != null ? phone.trim() : null);
        newCustomer.setEmail(email != null ? email.trim() : null);

        return this.b2bCustomerRepository.save(newCustomer);
    }
}
