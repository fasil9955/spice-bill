package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "invoices")
public class Invoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoice_id")
    private Integer invoiceId;

    @Column(name = "invoice_number", nullable = false, unique = true)
    private String invoiceNumber;

    @Column(name = "subtotal", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "tax_amount", precision = 10, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "cgst_amount", precision = 10, scale = 2)
    private BigDecimal cgstAmount;

    @Column(name = "sgst_amount", precision = 10, scale = 2)
    private BigDecimal sgstAmount;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method")
    private PaymentMethod paymentMethod;

    @Column(name = "cash_amount", precision = 10, scale = 2)
    private BigDecimal cashAmount;

    @Column(name = "card_amount", precision = 10, scale = 2)
    private BigDecimal cardAmount;

    @Column(name = "upi_amount", precision = 10, scale = 2)
    private BigDecimal upiAmount;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "cashier_id", nullable = false)
    @JsonIgnoreProperties({"password", "hibernateLazyInitializer", "handler"})
    private User cashier;

    @OneToMany(mappedBy = "invoice", cascade = {CascadeType.ALL}, fetch = FetchType.EAGER, orphanRemoval = true)
    private List<InvoiceItem> items;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InvoiceStatus status;

    @Column(name = "cancellation_requested_at")
    private LocalDateTime cancellationRequestedAt;

    @Column(name = "cancellation_reason")
    private String cancellationReason;

    @Column(name = "invoice_type", length = 10)
    private String invoiceType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "b2b_customer_id")
    @JsonIgnoreProperties({"invoices", "hibernateLazyInitializer", "handler"})
    private B2BCustomer b2bCustomer;

    @Column(name = "eway_bill_number", length = 50)
    private String ewayBillNumber;

    @Column(name = "total_packages")
    private Integer totalPackages;

    public enum InvoiceStatus {
        ACTIVE, CANCELLATION_REQUESTED, CANCELLED;
    }

    public enum PaymentMethod {
        CASH, CARD, UPI, MIXED;
    }

    public Invoice() {
        this.subtotal = BigDecimal.ZERO;
        this.taxAmount = BigDecimal.ZERO;
        this.cgstAmount = BigDecimal.ZERO;
        this.sgstAmount = BigDecimal.ZERO;
        this.discountAmount = BigDecimal.ZERO;
        this.paymentMethod = PaymentMethod.CASH;
        this.cashAmount = BigDecimal.ZERO;
        this.cardAmount = BigDecimal.ZERO;
        this.upiAmount = BigDecimal.ZERO;
        this.status = InvoiceStatus.ACTIVE;
        this.invoiceType = "B2C";
    }

    public Invoice(Integer invoiceId, String invoiceNumber, BigDecimal subtotal, BigDecimal taxAmount, BigDecimal cgstAmount, BigDecimal sgstAmount, BigDecimal discountAmount, BigDecimal totalAmount, PaymentMethod paymentMethod, BigDecimal cashAmount, BigDecimal cardAmount, BigDecimal upiAmount, User cashier, List<InvoiceItem> items, LocalDateTime createdAt, LocalDateTime updatedAt, InvoiceStatus status, LocalDateTime cancellationRequestedAt, String cancellationReason, String invoiceType, B2BCustomer b2bCustomer, String ewayBillNumber) {
        this.invoiceId = invoiceId;
        this.invoiceNumber = invoiceNumber;
        this.subtotal = subtotal != null ? subtotal : BigDecimal.ZERO;
        this.taxAmount = taxAmount != null ? taxAmount : BigDecimal.ZERO;
        this.cgstAmount = cgstAmount != null ? cgstAmount : BigDecimal.ZERO;
        this.sgstAmount = sgstAmount != null ? sgstAmount : BigDecimal.ZERO;
        this.discountAmount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
        this.totalAmount = totalAmount;
        this.paymentMethod = paymentMethod != null ? paymentMethod : PaymentMethod.CASH;
        this.cashAmount = cashAmount != null ? cashAmount : BigDecimal.ZERO;
        this.cardAmount = cardAmount != null ? cardAmount : BigDecimal.ZERO;
        this.upiAmount = upiAmount != null ? upiAmount : BigDecimal.ZERO;
        this.cashier = cashier;
        this.items = items;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.status = status != null ? status : InvoiceStatus.ACTIVE;
        this.cancellationRequestedAt = cancellationRequestedAt;
        this.cancellationReason = cancellationReason;
        this.invoiceType = invoiceType != null ? invoiceType : "B2C";
        this.b2bCustomer = b2bCustomer;
        this.ewayBillNumber = ewayBillNumber;
    }

    public void setInvoiceId(Integer invoiceId) {
        this.invoiceId = invoiceId;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }

    public void setCgstAmount(BigDecimal cgstAmount) {
        this.cgstAmount = cgstAmount;
    }

    public void setSgstAmount(BigDecimal sgstAmount) {
        this.sgstAmount = sgstAmount;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public void setPaymentMethod(PaymentMethod paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public void setCashAmount(BigDecimal cashAmount) {
        this.cashAmount = cashAmount;
    }

    public void setCardAmount(BigDecimal cardAmount) {
        this.cardAmount = cardAmount;
    }

    public void setUpiAmount(BigDecimal upiAmount) {
        this.upiAmount = upiAmount;
    }

    public void setCashier(User cashier) {
        this.cashier = cashier;
    }

    public void setItems(List<InvoiceItem> items) {
        this.items = items;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public void setStatus(InvoiceStatus status) {
        this.status = status;
    }

    public void setCancellationRequestedAt(LocalDateTime cancellationRequestedAt) {
        this.cancellationRequestedAt = cancellationRequestedAt;
    }

    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }

    public void setInvoiceType(String invoiceType) {
        this.invoiceType = invoiceType;
    }

    public void setB2bCustomer(B2BCustomer b2bCustomer) {
        this.b2bCustomer = b2bCustomer;
    }

    public void setEwayBillNumber(String ewayBillNumber) {
        this.ewayBillNumber = ewayBillNumber;
    }

    public void setTotalPackages(Integer totalPackages) {
        this.totalPackages = totalPackages;
    }

    public Integer getInvoiceId() {
        return this.invoiceId;
    }

    public String getInvoiceNumber() {
        return this.invoiceNumber;
    }

    public BigDecimal getSubtotal() {
        return this.subtotal;
    }

    public BigDecimal getTaxAmount() {
        return this.taxAmount;
    }

    public BigDecimal getCgstAmount() {
        return this.cgstAmount;
    }

    public BigDecimal getSgstAmount() {
        return this.sgstAmount;
    }

    public BigDecimal getDiscountAmount() {
        return this.discountAmount;
    }

    public BigDecimal getTotalAmount() {
        return this.totalAmount;
    }

    public PaymentMethod getPaymentMethod() {
        return this.paymentMethod;
    }

    public BigDecimal getCashAmount() {
        return this.cashAmount;
    }

    public String getInvoiceType() {
        return this.invoiceType;
    }

    public BigDecimal getCardAmount() {
        return this.cardAmount;
    }

    public BigDecimal getUpiAmount() {
        return this.upiAmount;
    }

    public User getCashier() {
        return this.cashier;
    }

    public List<InvoiceItem> getItems() {
        return this.items;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
    }

    public InvoiceStatus getStatus() {
        return this.status;
    }

    public LocalDateTime getCancellationRequestedAt() {
        return this.cancellationRequestedAt;
    }

    public String getCancellationReason() {
        return this.cancellationReason;
    }

    public B2BCustomer getB2bCustomer() {
        return this.b2bCustomer;
    }

    public String getEwayBillNumber() {
        return this.ewayBillNumber;
    }

    public Integer getTotalPackages() {
        return this.totalPackages;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof Invoice)) return false;
        Invoice other = (Invoice) o;
        if (!other.canEqual(this)) return false;
        Object this$invoiceId = getInvoiceId(), other$invoiceId = other.getInvoiceId();
        if ((this$invoiceId == null) ? (other$invoiceId != null) : !this$invoiceId.equals(other$invoiceId)) return false;
        Object this$invoiceNumber = getInvoiceNumber(), other$invoiceNumber = other.getInvoiceNumber();
        if ((this$invoiceNumber == null) ? (other$invoiceNumber != null) : !this$invoiceNumber.equals(other$invoiceNumber)) return false;
        Object this$subtotal = getSubtotal(), other$subtotal = other.getSubtotal();
        if ((this$subtotal == null) ? (other$subtotal != null) : !this$subtotal.equals(other$subtotal)) return false;
        Object this$taxAmount = getTaxAmount(), other$taxAmount = other.getTaxAmount();
        if ((this$taxAmount == null) ? (other$taxAmount != null) : !this$taxAmount.equals(other$taxAmount)) return false;
        Object this$cgstAmount = getCgstAmount(), other$cgstAmount = other.getCgstAmount();
        if ((this$cgstAmount == null) ? (other$cgstAmount != null) : !this$cgstAmount.equals(other$cgstAmount)) return false;
        Object this$sgstAmount = getSgstAmount(), other$sgstAmount = other.getSgstAmount();
        if ((this$sgstAmount == null) ? (other$sgstAmount != null) : !this$sgstAmount.equals(other$sgstAmount)) return false;
        Object this$discountAmount = getDiscountAmount(), other$discountAmount = other.getDiscountAmount();
        if ((this$discountAmount == null) ? (other$discountAmount != null) : !this$discountAmount.equals(other$discountAmount)) return false;
        Object this$totalAmount = getTotalAmount(), other$totalAmount = other.getTotalAmount();
        if ((this$totalAmount == null) ? (other$totalAmount != null) : !this$totalAmount.equals(other$totalAmount)) return false;
        Object this$paymentMethod = getPaymentMethod(), other$paymentMethod = other.getPaymentMethod();
        if ((this$paymentMethod == null) ? (other$paymentMethod != null) : !this$paymentMethod.equals(other$paymentMethod)) return false;
        Object this$cashAmount = getCashAmount(), other$cashAmount = other.getCashAmount();
        if ((this$cashAmount == null) ? (other$cashAmount != null) : !this$cashAmount.equals(other$cashAmount)) return false;
        Object this$cardAmount = getCardAmount(), other$cardAmount = other.getCardAmount();
        if ((this$cardAmount == null) ? (other$cardAmount != null) : !this$cardAmount.equals(other$cardAmount)) return false;
        Object this$upiAmount = getUpiAmount(), other$upiAmount = other.getUpiAmount();
        if ((this$upiAmount == null) ? (other$upiAmount != null) : !this$upiAmount.equals(other$upiAmount)) return false;
        Object this$cashier = getCashier(), other$cashier = other.getCashier();
        if ((this$cashier == null) ? (other$cashier != null) : !this$cashier.equals(other$cashier)) return false;
        Object this$items = getItems(), other$items = other.getItems();
        if ((this$items == null) ? (other$items != null) : !this$items.equals(other$items)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        if ((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt)) return false;
        Object this$status = getStatus(), other$status = other.getStatus();
        if ((this$status == null) ? (other$status != null) : !this$status.equals(other$status)) return false;
        Object this$cancellationRequestedAt = getCancellationRequestedAt(), other$cancellationRequestedAt = other.getCancellationRequestedAt();
        if ((this$cancellationRequestedAt == null) ? (other$cancellationRequestedAt != null) : !this$cancellationRequestedAt.equals(other$cancellationRequestedAt)) return false;
        Object this$cancellationReason = getCancellationReason(), other$cancellationReason = other.getCancellationReason();
        if ((this$cancellationReason == null) ? (other$cancellationReason != null) : !this$cancellationReason.equals(other$cancellationReason)) return false;
        Object this$invoiceType = getInvoiceType(), other$invoiceType = other.getInvoiceType();
        if ((this$invoiceType == null) ? (other$invoiceType != null) : !this$invoiceType.equals(other$invoiceType)) return false;
        Object this$b2bCustomer = getB2bCustomer(), other$b2bCustomer = other.getB2bCustomer();
        if ((this$b2bCustomer == null) ? (other$b2bCustomer != null) : !this$b2bCustomer.equals(other$b2bCustomer)) return false;
        Object this$ewayBillNumber = getEwayBillNumber(), other$ewayBillNumber = other.getEwayBillNumber();
        return !((this$ewayBillNumber == null) ? (other$ewayBillNumber != null) : !this$ewayBillNumber.equals(other$ewayBillNumber));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Invoice;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $invoiceId = getInvoiceId();
        result = result * PRIME + (($invoiceId == null) ? 43 : $invoiceId.hashCode());
        Object $invoiceNumber = getInvoiceNumber();
        result = result * PRIME + (($invoiceNumber == null) ? 43 : $invoiceNumber.hashCode());
        Object $subtotal = getSubtotal();
        result = result * PRIME + (($subtotal == null) ? 43 : $subtotal.hashCode());
        Object $taxAmount = getTaxAmount();
        result = result * PRIME + (($taxAmount == null) ? 43 : $taxAmount.hashCode());
        Object $cgstAmount = getCgstAmount();
        result = result * PRIME + (($cgstAmount == null) ? 43 : $cgstAmount.hashCode());
        Object $sgstAmount = getSgstAmount();
        result = result * PRIME + (($sgstAmount == null) ? 43 : $sgstAmount.hashCode());
        Object $discountAmount = getDiscountAmount();
        result = result * PRIME + (($discountAmount == null) ? 43 : $discountAmount.hashCode());
        Object $totalAmount = getTotalAmount();
        result = result * PRIME + (($totalAmount == null) ? 43 : $totalAmount.hashCode());
        Object $paymentMethod = getPaymentMethod();
        result = result * PRIME + (($paymentMethod == null) ? 43 : $paymentMethod.hashCode());
        Object $cashAmount = getCashAmount();
        result = result * PRIME + (($cashAmount == null) ? 43 : $cashAmount.hashCode());
        Object $cardAmount = getCardAmount();
        result = result * PRIME + (($cardAmount == null) ? 43 : $cardAmount.hashCode());
        Object $upiAmount = getUpiAmount();
        result = result * PRIME + (($upiAmount == null) ? 43 : $upiAmount.hashCode());
        Object $cashier = getCashier();
        result = result * PRIME + (($cashier == null) ? 43 : $cashier.hashCode());
        Object $items = getItems();
        result = result * PRIME + (($items == null) ? 43 : $items.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        result = result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
        Object $status = getStatus();
        result = result * PRIME + (($status == null) ? 43 : $status.hashCode());
        Object $cancellationRequestedAt = getCancellationRequestedAt();
        result = result * PRIME + (($cancellationRequestedAt == null) ? 43 : $cancellationRequestedAt.hashCode());
        Object $cancellationReason = getCancellationReason();
        result = result * PRIME + (($cancellationReason == null) ? 43 : $cancellationReason.hashCode());
        Object $invoiceType = getInvoiceType();
        result = result * PRIME + (($invoiceType == null) ? 43 : $invoiceType.hashCode());
        Object $b2bCustomer = getB2bCustomer();
        result = result * PRIME + (($b2bCustomer == null) ? 43 : $b2bCustomer.hashCode());
        Object $ewayBillNumber = getEwayBillNumber();
        return result * PRIME + (($ewayBillNumber == null) ? 43 : $ewayBillNumber.hashCode());
    }

    @Override
    public String toString() {
        return "Invoice(invoiceId=" + getInvoiceId() + ", invoiceNumber=" + getInvoiceNumber() + ", subtotal=" + getSubtotal() + ", taxAmount=" + getTaxAmount() + ", cgstAmount=" + getCgstAmount() + ", sgstAmount=" + getSgstAmount() + ", discountAmount=" + getDiscountAmount() + ", totalAmount=" + getTotalAmount() + ", paymentMethod=" + getPaymentMethod() + ", cashAmount=" + getCashAmount() + ", cardAmount=" + getCardAmount() + ", upiAmount=" + getUpiAmount() + ", cashier=" + getCashier() + ", items=" + getItems() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ", status=" + getStatus() + ", cancellationRequestedAt=" + getCancellationRequestedAt() + ", cancellationReason=" + getCancellationReason() + ", invoiceType=" + getInvoiceType() + ", b2bCustomer=" + getB2bCustomer() + ", ewayBillNumber=" + getEwayBillNumber() + ")";
    }
}
