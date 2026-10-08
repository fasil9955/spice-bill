package com.spicesshop.billing.service;

import com.spicesshop.billing.model.*;
import com.spicesshop.billing.repository.*;
import com.spicesshop.billing.util.GstInvoiceNumbers;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.locks.ReentrantLock;
import java.util.stream.Collectors;
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

    @Autowired
    private CourierRequestRepository courierRequestRepository;

    @Autowired
    private ReportService reportService;

    private final ReentrantLock retailNumberAlignLock = new ReentrantLock();

    /** Returns the next invoice number for preview only – does NOT increment (peek). */
    public String getNextInvoiceNumber(String companyName, String invoiceType) {
        return peekNextInvoiceNumber(companyName, invoiceType != null ? invoiceType : "RETAIL");
    }

    /** Peek: returns what the next number would be without incrementing. Used for preview. */
    public String peekNextInvoiceNumber(String companyName, String invoiceType) {
        if ("B2B".equals(invoiceType)) {
            return generateNextB2BInvoiceNumber(companyName);
        }
        if ("CREDIT_NOTE".equals(invoiceType) || "DEBIT_NOTE".equals(invoiceType)) {
            return peekNoteNumber(companyName, invoiceType);
        }
        LocalDate today = LocalDate.now();
        LocalDate fyStart = GstInvoiceNumbers.financialYearStart(today);
        // Preview must not scan invoices: that query waits when the other PC is saving a bill.
        int seqNum = this.invoiceSequenceRepository.findByCompanyNameAndSequenceDate(companyName, fyStart)
            .map(InvoiceSequence::getNextSequence)
            .orElse(1);
        if (seqNum < 1) {
            seqNum = 1;
        }
        return GstInvoiceNumbers.formatRetail(today, seqNum);
    }

    /** Generates and reserves the next invoice number (increments sequence). Call only when saving an invoice. */
    @Transactional
    public String generateInvoiceNumber(String companyName, String invoiceType) {
        if ("B2B".equals(invoiceType)) {
            return generateNextB2BInvoiceNumber(companyName);
        }
        if ("CREDIT_NOTE".equals(invoiceType) || "DEBIT_NOTE".equals(invoiceType)) {
            return peekNoteNumber(companyName, invoiceType);
        }

        LocalDate today = LocalDate.now();
        LocalDate fyStart = GstInvoiceNumbers.financialYearStart(today);

        InvoiceSequence sequence = this.invoiceSequenceRepository.findByCompanyNameAndDateForUpdate(companyName, fyStart)
            .orElseGet(() -> new InvoiceSequence(companyName, fyStart));

        int seqNum = Math.max(sequence.getNextSequence() != null ? sequence.getNextSequence() : 1,
            nextRetailSequenceFromExisting(companyName, fyStart));
        sequence.setNextSequence(seqNum + 1);
        this.invoiceSequenceRepository.save(sequence);

        return GstInvoiceNumbers.formatRetail(today, seqNum);
    }

    private int nextRetailSequenceFromExisting(String companyName, LocalDate fyStart) {
        String maxNumber = this.invoiceRepository.findMaxInvoiceNumberByPrefix(
            companyName, GstInvoiceNumbers.likePrefix(fyStart));
        return GstInvoiceNumbers.parseSequence(maxNumber) + 1;
    }

    private String peekNoteNumber(String companyName, String invoiceType) {
        LocalDate today = LocalDate.now();
        String series = "CREDIT_NOTE".equals(invoiceType) ? "CN" : "DN";
        String maxNumber = this.invoiceRepository.findMaxInvoiceNumberByPrefix(
            companyName, GstInvoiceNumbers.likePrefixNote(series, today));
        int seq = GstInvoiceNumbers.parseSequence(maxNumber) + 1;
        if (seq < 1) {
            seq = 1;
        }
        return GstInvoiceNumbers.formatNote(series, today, seq);
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
                copy.setGstPercentage(item.getGstPercentage());
                copy.setNumberOfPackages(item.getNumberOfPackages());
                normalized.put(key, copy);
            } else {
                existing.setQuantity(existing.getQuantity().add(quantity));
                existing.setDiscountAmount(existing.getDiscountAmount().add(discountAmount));
                Integer pkg = (existing.getNumberOfPackages() != null ? existing.getNumberOfPackages() : 0)
                    + (item.getNumberOfPackages() != null ? item.getNumberOfPackages() : 0);
                existing.setNumberOfPackages(pkg > 0 ? pkg : null);
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
        String type = invoice.getInvoiceType() != null ? invoice.getInvoiceType() : "RETAIL";
        invoice.setInvoiceType(type);

        if ("CREDIT_NOTE".equals(type) || "DEBIT_NOTE".equals(type)) {
            if (invoice.getOriginalInvoiceId() != null) {
                Invoice original = this.invoiceRepository.findById(invoice.getOriginalInvoiceId())
                    .orElseThrow(() -> new RuntimeException("Original invoice not found"));
                String originalCompany = original.getCashier() != null ? original.getCashier().getCompanyName() : null;
                if (!companyName.equals(originalCompany)) {
                    throw new RuntimeException("Original invoice not found");
                }
                if (!"B2B".equals(original.getInvoiceType())) {
                    throw new RuntimeException("Credit/debit notes can only be issued against a B2B tax invoice");
                }
                if (invoice.getOriginalInvoiceNumber() == null || invoice.getOriginalInvoiceNumber().isBlank()) {
                    invoice.setOriginalInvoiceNumber(original.getInvoiceNumber());
                }
                if (invoice.getOriginalInvoiceDate() == null && original.getCreatedAt() != null) {
                    invoice.setOriginalInvoiceDate(original.getCreatedAt().toLocalDate());
                }
                if (invoice.getB2bCustomer() == null) {
                    invoice.setB2bCustomer(original.getB2bCustomer());
                }
            } else {
                String origNo = invoice.getOriginalInvoiceNumber() != null ? invoice.getOriginalInvoiceNumber().trim() : "";
                if (origNo.isEmpty()) {
                    throw new RuntimeException("Enter the original tax invoice number (e.g. BVT/54/25-26)");
                }
                invoice.setOriginalInvoiceNumber(origNo);
                if (invoice.getB2bCustomer() == null) {
                    throw new RuntimeException("Select the party you are returning goods to");
                }
            }
            if (invoice.getNoteReason() == null || invoice.getNoteReason().isBlank()) {
                invoice.setNoteReason("Sales Return");
            }
        }

        // RETAIL: always generate and increment on save (never use number from preview)
        if ("RETAIL".equals(type)) {
            invoice.setInvoiceNumber(generateInvoiceNumber(companyName, type));
        } else {
            if (invoice.getInvoiceNumber() == null || invoice.getInvoiceNumber().trim().isEmpty()) {
                invoice.setInvoiceNumber(generateInvoiceNumber(companyName, type));
            } else {
                Optional<Invoice> existingInvoice = this.invoiceRepository.findByInvoiceNumber(invoice.getInvoiceNumber());
                if (existingInvoice.isPresent()) {
                    throw new RuntimeException("Invoice number " + invoice.getInvoiceNumber() + " already exists");
                }
            }
        }

        List<InvoiceItem> normalizedItems = normalizeInvoiceItems(items);

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
            itemTotal = itemTotal.subtract(item.getDiscountAmount() != null ? item.getDiscountAmount() : BigDecimal.ZERO);

            // GST: use item's gstPercentage if already set (e.g. from B2B payload), else category
            BigDecimal gstPct = item.getGstPercentage() != null && item.getGstPercentage().compareTo(BigDecimal.ZERO) >= 0
                ? item.getGstPercentage()
                : (product.getCategory() != null ? product.getCategory().getGstPercentage() : null);
            if (gstPct == null) gstPct = BigDecimal.ZERO;
            item.setGstPercentage(gstPct);
            if (gstPct.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal gstAmount;
                BigDecimal totalPrice;
                if (Invoice.isB2bFamily(invoice.getInvoiceType())) {
                    // B2B / credit / debit notes: tax is added AFTER price (tax-exclusive). itemTotal = taxable base.
                    gstAmount = itemTotal.multiply(gstPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    totalPrice = itemTotal.add(gstAmount);
                } else {
                    // B2C/Retail: itemTotal is tax-inclusive; back out taxable and tax.
                    BigDecimal onePlusGst = BigDecimal.ONE.add(gstPct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
                    BigDecimal taxableValue = itemTotal.divide(onePlusGst, 2, RoundingMode.HALF_UP);
                    gstAmount = itemTotal.subtract(taxableValue);
                    totalPrice = itemTotal;
                }
                item.setTotalPrice(totalPrice);
                BigDecimal halfGst = gstAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                item.setCgstAmount(halfGst);
                item.setSgstAmount(halfGst);
            } else {
                item.setTotalPrice(itemTotal);
                item.setCgstAmount(BigDecimal.ZERO);
                item.setSgstAmount(BigDecimal.ZERO);
            }

            if ("CREDIT_NOTE".equals(invoice.getInvoiceType())) {
                product.setQuantity(product.getQuantity().add(item.getQuantity()));
            } else {
                BigDecimal newQuantity = product.getQuantity().subtract(item.getQuantity());
                if (newQuantity.compareTo(BigDecimal.ZERO) < 0) {
                    throw new RuntimeException("Insufficient stock for product: " + product.getProductName());
                }
                product.setQuantity(newQuantity);
            }
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

        // Subtotal (taxable) = sum over items of (totalPrice - CGST - SGST)
        BigDecimal subtotalBeforeTax = normalizedItems.stream()
            .map(i -> (i.getTotalPrice() != null ? i.getTotalPrice() : BigDecimal.ZERO)
                .subtract(i.getCgstAmount() != null ? i.getCgstAmount() : BigDecimal.ZERO)
                .subtract(i.getSgstAmount() != null ? i.getSgstAmount() : BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        invoice.setSubtotal(subtotalBeforeTax);
        BigDecimal sumItemTotals = normalizedItems.stream()
            .map(i -> i.getTotalPrice() != null ? i.getTotalPrice() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (Invoice.isB2bFamily(invoice.getInvoiceType())) {
            invoice.setTotalAmount(subtotalBeforeTax.add(invoice.getTaxAmount()).subtract(invoice.getDiscountAmount() != null ? invoice.getDiscountAmount() : BigDecimal.ZERO));
        } else {
            invoice.setTotalAmount(sumItemTotals.subtract(invoice.getDiscountAmount() != null ? invoice.getDiscountAmount() : BigDecimal.ZERO));
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
        return getInvoicesByDate(date, companyName, false);
    }

    /**
     * When {@code activeSalesOnly} is true, excludes invoices that are cancelled or awaiting cancellation approval,
     * so totals match realised retail sales for accounting.
     */
    public List<Invoice> getInvoicesByDate(LocalDate date, String companyName, boolean activeSalesOnly) {
        List<Invoice> list = this.invoiceRepository.findByCompanyNameAndDate(companyName, date);
        if (!activeSalesOnly) {
            return list;
        }
        return list.stream()
            .filter(inv -> inv.getStatus() == Invoice.InvoiceStatus.ACTIVE)
            .collect(Collectors.toList());
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
        existingInvoice.setUpiAccount(updatedInvoice.getUpiAccount());

        if (updatedInvoice.getEwayBillNumber() != null) {
            existingInvoice.setEwayBillNumber(updatedInvoice.getEwayBillNumber());
        }
        existingInvoice.setTotalPackages(updatedInvoice.getTotalPackages());

        // Preserve B2B customer linkage exactly as selected in edit flow.
        // Do not recreate customer records during invoice update.
        if (updatedInvoice.getB2bCustomer() != null) {
            existingInvoice.setB2bCustomer(updatedInvoice.getB2bCustomer());
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
            itemTotal = itemTotal.subtract(item.getDiscountAmount() != null ? item.getDiscountAmount() : BigDecimal.ZERO);

            BigDecimal gstPct = item.getGstPercentage() != null && item.getGstPercentage().compareTo(BigDecimal.ZERO) >= 0
                ? item.getGstPercentage()
                : (product.getCategory() != null ? product.getCategory().getGstPercentage() : null);
            if (gstPct == null) gstPct = BigDecimal.ZERO;
            item.setGstPercentage(gstPct);
            if (gstPct.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal gstAmount;
                BigDecimal totalPrice;
                if ("B2B".equals(existingInvoice.getInvoiceType())) {
                    gstAmount = itemTotal.multiply(gstPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
                    totalPrice = itemTotal.add(gstAmount);
                } else {
                    BigDecimal onePlusGst = BigDecimal.ONE.add(gstPct.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP));
                    BigDecimal taxableValue = itemTotal.divide(onePlusGst, 2, RoundingMode.HALF_UP);
                    gstAmount = itemTotal.subtract(taxableValue);
                    totalPrice = itemTotal;
                }
                item.setTotalPrice(totalPrice);
                BigDecimal halfGst = gstAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                item.setCgstAmount(halfGst);
                item.setSgstAmount(halfGst);
            } else {
                item.setTotalPrice(itemTotal);
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
        BigDecimal subtotalBeforeTax = existingInvoice.getItems().stream()
            .map(i -> (i.getTotalPrice() != null ? i.getTotalPrice() : BigDecimal.ZERO)
                .subtract(i.getCgstAmount() != null ? i.getCgstAmount() : BigDecimal.ZERO)
                .subtract(i.getSgstAmount() != null ? i.getSgstAmount() : BigDecimal.ZERO))
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        existingInvoice.setSubtotal(subtotalBeforeTax);
        existingInvoice.setCgstAmount(totalCgst);
        existingInvoice.setSgstAmount(totalSgst);
        existingInvoice.setTaxAmount(totalCgst.add(totalSgst));
        if ("B2B".equals(existingInvoice.getInvoiceType())) {
            existingInvoice.setTotalAmount(subtotalBeforeTax.add(totalCgst.add(totalSgst)).subtract(existingInvoice.getDiscountAmount() != null ? existingInvoice.getDiscountAmount() : BigDecimal.ZERO));
        } else {
            existingInvoice.setTotalAmount(sumItemTotals.subtract(existingInvoice.getDiscountAmount() != null ? existingInvoice.getDiscountAmount() : BigDecimal.ZERO));
        }

        return this.invoiceRepository.save(existingInvoice);
    }

    /** Soft delete only: mark B2B invoice as CANCELLED. No hard delete allowed for B2B sale report. */
    @Transactional
    public void deleteB2BInvoice(Integer invoiceId, String companyName) {
        deleteB2BInvoice(invoiceId, companyName, null);
    }

    @Transactional
    public void deleteB2BInvoice(Integer invoiceId, String companyName, String reason) {
        Invoice invoice = getInvoiceById(invoiceId, companyName)
            .orElseThrow(() -> new RuntimeException("Invoice not found"));

        if (!Invoice.isB2bFamily(invoice.getInvoiceType())) {
            throw new RuntimeException("Only B2B invoices can be deleted from this report");
        }

        invoice.setStatus(Invoice.InvoiceStatus.CANCELLED);
        invoice.setCancellationRequestedAt(invoice.getCancellationRequestedAt() != null ? invoice.getCancellationRequestedAt() : LocalDateTime.now());
        if (reason != null && !reason.isBlank()) {
            invoice.setCancellationReason(reason.trim());
        } else if (invoice.getCancellationReason() == null || invoice.getCancellationReason().isBlank()) {
            invoice.setCancellationReason("Marked cancelled from B2B report");
        }
        this.invoiceRepository.save(invoice);
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

    /** Soft delete: mark invoice as CANCELLED and reverse stock. No hard delete. */
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

        invoice.setStatus(Invoice.InvoiceStatus.CANCELLED);
        this.invoiceRepository.save(invoice);
    }

    public List<Invoice> getMonthlyInvoices(String companyName, int year, int month) {
        LocalDateTime startDate = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime endDate = startDate.plusMonths(1).minusSeconds(1);
        return getInvoicesByDateRange(startDate, endDate, companyName);
    }

    /**
     * Permanently delete CANCELLED B2C/BTOC invoices only (non-B2B) for a company.
     * B2B invoices are never hard-deleted (kept for reports/audit).
     */
    @Transactional
    public int purgeCancelledBtocInvoices(String companyName) {
        List<Invoice> toDelete = this.invoiceRepository.findCancelledNonB2BByCompany(companyName);
        if (toDelete == null || toDelete.isEmpty()) return 0;
        int count = toDelete.size();
        // Invoice has cascade + orphanRemoval on items, so deleting invoice deletes its items.
        this.invoiceRepository.deleteAll(toDelete);
        this.invoiceRepository.flush();
        return count;
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

    /**
     * Permanently removes retail CASH invoices for one calendar day, then rewrites
     * remaining retail numbers so the GST series stays consecutive.
     * Stock is not restored (quantities stay decreased).
     */
    @Transactional
    public Map<String, Object> deleteRetailCashInvoicesForDate(String companyName, LocalDate date) {
        if (date == null) {
            throw new RuntimeException("Date is required");
        }
        List<Invoice> dayInvoices = this.invoiceRepository.findByCompanyNameAndDateRange(
            companyName,
            date.atStartOfDay(),
            date.plusDays(1).atStartOfDay().minusNanos(1)
        );
        List<Invoice> cashBills = dayInvoices.stream()
            .filter(i -> i.getPaymentMethod() == Invoice.PaymentMethod.CASH)
            .filter(i -> i.getInvoiceType() == null || !"B2B".equals(i.getInvoiceType()))
            .toList();
        if (cashBills.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("deleted", 0);
            empty.put("stockRestoredBills", 0);
            empty.put("date", date.toString());
            empty.put("nextPreview", peekNextInvoiceNumber(companyName, "RETAIL"));
            empty.put("renumbered", 0);
            return empty;
        }
        for (Invoice invoice : cashBills) {
            this.courierRequestRepository.deleteByInvoiceId(invoice.getInvoiceId());
            List<InvoiceItem> items = this.invoiceItemRepository.findByInvoice_InvoiceId(invoice.getInvoiceId());
            if (items != null && !items.isEmpty()) {
                this.invoiceItemRepository.deleteAll(items);
            }
            this.invoiceRepository.delete(invoice);
        }
        this.invoiceRepository.flush();
        this.invoiceItemRepository.flush();

        Map<String, Object> aligned = alignRetailInvoiceNumbersToGst(companyName);
        this.reportService.generateDailyReport(date, companyName);
        this.reportService.generateMonthlyReport(date.getYear(), date.getMonthValue(), companyName);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deleted", cashBills.size());
        result.put("stockRestoredBills", 0);
        result.put("date", date.toString());
        result.put("nextPreview", aligned.get("nextPreview"));
        result.put("renumbered", aligned.get("updated"));
        return result;
    }

    /**
     * Permanently removes every retail CASH invoice for the company (all dates),
     * then GST-renumbers remaining retail bills. Stock is not restored.
     */
    @Transactional
    public Map<String, Object> deleteAllRetailCashInvoices(String companyName) {
        List<Invoice> cashBills = this.invoiceRepository.findRetailCashInvoicesByCompany(companyName);
        if (cashBills.isEmpty()) {
            Map<String, Object> empty = new LinkedHashMap<>();
            empty.put("deleted", 0);
            empty.put("stockRestoredBills", 0);
            empty.put("nextPreview", peekNextInvoiceNumber(companyName, "RETAIL"));
            empty.put("renumbered", 0);
            return empty;
        }
        java.util.Set<LocalDate> days = new java.util.HashSet<>();
        java.util.Set<String> months = new java.util.HashSet<>();
        for (Invoice invoice : cashBills) {
            LocalDate d = invoice.getCreatedAt() != null ? invoice.getCreatedAt().toLocalDate() : LocalDate.now();
            days.add(d);
            months.add(d.getYear() + "-" + d.getMonthValue());
            this.courierRequestRepository.deleteByInvoiceId(invoice.getInvoiceId());
            List<InvoiceItem> items = this.invoiceItemRepository.findByInvoice_InvoiceId(invoice.getInvoiceId());
            if (items != null && !items.isEmpty()) {
                this.invoiceItemRepository.deleteAll(items);
            }
            this.invoiceRepository.delete(invoice);
        }
        this.invoiceRepository.flush();
        this.invoiceItemRepository.flush();

        Map<String, Object> aligned = alignRetailInvoiceNumbersToGst(companyName);
        for (LocalDate d : days) {
            this.reportService.generateDailyReport(d, companyName);
        }
        for (String ym : months) {
            String[] p = ym.split("-");
            this.reportService.generateMonthlyReport(Integer.parseInt(p[0]), Integer.parseInt(p[1]), companyName);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("deleted", cashBills.size());
        result.put("stockRestoredBills", 0);
        result.put("nextPreview", aligned.get("nextPreview"));
        result.put("renumbered", aligned.get("updated"));
        return result;
    }

    /**
     * Rewrites existing retail invoice numbers to GST Rule 46 serials, in bill-date order,
     * one consecutive series per financial year. Cancelled bills keep a number (not reused).
     * B2B invoices are not changed.
     * Number-only SQL is used so MySQL does not lock full invoice + line-item rows for minutes.
     */
    @Transactional(timeout = 180)
    public Map<String, Object> alignRetailInvoiceNumbersToGst(String companyName) {
        if (!this.retailNumberAlignLock.tryLock()) {
            throw new IllegalStateException(
                "The first Change bill number is still running in the background (the screen going off does not stop it). Wait about 1 minute, then click once and keep this window open.");
        }
        try {
            return rewriteRetailInvoiceNumbersToGst(companyName);
        } finally {
            this.retailNumberAlignLock.unlock();
        }
    }

    private Map<String, Object> rewriteRetailInvoiceNumbersToGst(String companyName) {
        List<Object[]> retail = this.invoiceRepository.findRetailInvoiceNumberRows(companyName);
        List<Map<String, String>> changed = new ArrayList<>();
        Map<LocalDate, Integer> nextByFy = new HashMap<>();

        this.invoiceRepository.migrateRetailNumbersToTemp(companyName);

        for (Object[] row : retail) {
            Integer invoiceId = (Integer) row[0];
            LocalDateTime createdAt = (LocalDateTime) row[1];
            String oldNumber = row[2] != null ? String.valueOf(row[2]) : "";
            LocalDate billDate = createdAt != null ? createdAt.toLocalDate() : LocalDate.now();
            LocalDate fyStart = GstInvoiceNumbers.financialYearStart(billDate);
            int seq = nextByFy.getOrDefault(fyStart, 1);
            String newNumber = GstInvoiceNumbers.formatRetail(billDate, seq);
            nextByFy.put(fyStart, seq + 1);
            this.invoiceRepository.updateInvoiceNumberById(invoiceId, newNumber);
            if (!oldNumber.equals(newNumber)) {
                Map<String, String> change = new LinkedHashMap<>();
                change.put("invoiceId", String.valueOf(invoiceId));
                change.put("from", oldNumber);
                change.put("to", newNumber);
                changed.add(change);
            }
        }

        this.courierRequestRepository.syncRetailCourierInvoiceNumbers(companyName);

        for (Map.Entry<LocalDate, Integer> entry : nextByFy.entrySet()) {
            InvoiceSequence sequence = this.invoiceSequenceRepository
                .findByCompanyNameAndSequenceDate(companyName, entry.getKey())
                .orElseGet(() -> new InvoiceSequence(companyName, entry.getKey()));
            sequence.setNextSequence(entry.getValue());
            this.invoiceSequenceRepository.save(sequence);
        }
        if (nextByFy.isEmpty()) {
            LocalDate fyStart = GstInvoiceNumbers.financialYearStart(LocalDate.now());
            InvoiceSequence sequence = this.invoiceSequenceRepository
                .findByCompanyNameAndSequenceDate(companyName, fyStart)
                .orElseGet(() -> new InvoiceSequence(companyName, fyStart));
            sequence.setNextSequence(1);
            this.invoiceSequenceRepository.save(sequence);
        }

        List<Map<String, String>> sample = changed.stream().limit(12).toList();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("updated", changed.size());
        result.put("financialYears", nextByFy.size());
        result.put("nextPreview", peekNextInvoiceNumber(companyName, "RETAIL"));
        result.put("sample", sample);
        return result;
    }
}
