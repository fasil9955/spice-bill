package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "invoice_items")
public class InvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "item_id")
    private Integer itemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    @JsonIgnore
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "companyName"})
    private Product product;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "barcode")
    private String barcode;

    @Column(name = "quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "discount_percent", precision = 5, scale = 2)
    private BigDecimal discountPercent;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;

    @Column(name = "total_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalPrice;

    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(name = "unit", length = 20)
    private String unit;

    @Column(name = "gst_percentage", precision = 5, scale = 2)
    private BigDecimal gstPercentage;

    @Column(name = "cgst_amount", precision = 10, scale = 2)
    private BigDecimal cgstAmount;

    @Column(name = "sgst_amount", precision = 10, scale = 2)
    private BigDecimal sgstAmount;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public InvoiceItem() {
        this.discountPercent = BigDecimal.ZERO;
        this.discountAmount = BigDecimal.ZERO;
    }

    public InvoiceItem(Integer itemId, Invoice invoice, Product product, String productName, String barcode, BigDecimal quantity, BigDecimal unitPrice, BigDecimal discountPercent, BigDecimal discountAmount, BigDecimal totalPrice, String hsnCode, LocalDateTime createdAt) {
        this.itemId = itemId;
        this.invoice = invoice;
        this.product = product;
        this.productName = productName;
        this.barcode = barcode;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.discountPercent = discountPercent != null ? discountPercent : BigDecimal.ZERO;
        this.discountAmount = discountAmount != null ? discountAmount : BigDecimal.ZERO;
        this.totalPrice = totalPrice;
        this.hsnCode = hsnCode;
        this.createdAt = createdAt;
    }

    public void setItemId(Integer itemId) {
        this.itemId = itemId;
    }

    @JsonIgnore
    public void setInvoice(Invoice invoice) {
        this.invoice = invoice;
    }

    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "companyName"})
    public void setProduct(Product product) {
        this.product = product;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public void setDiscountPercent(BigDecimal discountPercent) {
        this.discountPercent = discountPercent;
    }

    public void setDiscountAmount(BigDecimal discountAmount) {
        this.discountAmount = discountAmount;
    }

    public void setTotalPrice(BigDecimal totalPrice) {
        this.totalPrice = totalPrice;
    }

    public void setHsnCode(String hsnCode) {
        this.hsnCode = hsnCode;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public void setGstPercentage(BigDecimal gstPercentage) {
        this.gstPercentage = gstPercentage;
    }

    public void setCgstAmount(BigDecimal cgstAmount) {
        this.cgstAmount = cgstAmount;
    }

    public void setSgstAmount(BigDecimal sgstAmount) {
        this.sgstAmount = sgstAmount;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getItemId() {
        return this.itemId;
    }

    public Invoice getInvoice() {
        return this.invoice;
    }

    public Product getProduct() {
        return this.product;
    }

    public String getProductName() {
        return this.productName;
    }

    public String getBarcode() {
        return this.barcode;
    }

    public BigDecimal getQuantity() {
        return this.quantity;
    }

    public BigDecimal getUnitPrice() {
        return this.unitPrice;
    }

    public BigDecimal getDiscountPercent() {
        return this.discountPercent;
    }

    public BigDecimal getDiscountAmount() {
        return this.discountAmount;
    }

    public BigDecimal getTotalPrice() {
        return this.totalPrice;
    }

    public String getHsnCode() {
        return this.hsnCode;
    }

    public String getUnit() {
        return this.unit;
    }

    public BigDecimal getGstPercentage() {
        return this.gstPercentage;
    }

    public BigDecimal getCgstAmount() {
        return this.cgstAmount;
    }

    public BigDecimal getSgstAmount() {
        return this.sgstAmount;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof InvoiceItem)) return false;
        InvoiceItem other = (InvoiceItem) o;
        if (!other.canEqual(this)) return false;
        Object this$itemId = getItemId(), other$itemId = other.getItemId();
        if ((this$itemId == null) ? (other$itemId != null) : !this$itemId.equals(other$itemId)) return false;
        Object this$invoice = getInvoice(), other$invoice = other.getInvoice();
        if ((this$invoice == null) ? (other$invoice != null) : !this$invoice.equals(other$invoice)) return false;
        Object this$product = getProduct(), other$product = other.getProduct();
        if ((this$product == null) ? (other$product != null) : !this$product.equals(other$product)) return false;
        Object this$productName = getProductName(), other$productName = other.getProductName();
        if ((this$productName == null) ? (other$productName != null) : !this$productName.equals(other$productName)) return false;
        Object this$barcode = getBarcode(), other$barcode = other.getBarcode();
        if ((this$barcode == null) ? (other$barcode != null) : !this$barcode.equals(other$barcode)) return false;
        Object this$quantity = getQuantity(), other$quantity = other.getQuantity();
        if ((this$quantity == null) ? (other$quantity != null) : !this$quantity.equals(other$quantity)) return false;
        Object this$unitPrice = getUnitPrice(), other$unitPrice = other.getUnitPrice();
        if ((this$unitPrice == null) ? (other$unitPrice != null) : !this$unitPrice.equals(other$unitPrice)) return false;
        Object this$discountPercent = getDiscountPercent(), other$discountPercent = other.getDiscountPercent();
        if ((this$discountPercent == null) ? (other$discountPercent != null) : !this$discountPercent.equals(other$discountPercent)) return false;
        Object this$discountAmount = getDiscountAmount(), other$discountAmount = other.getDiscountAmount();
        if ((this$discountAmount == null) ? (other$discountAmount != null) : !this$discountAmount.equals(other$discountAmount)) return false;
        Object this$totalPrice = getTotalPrice(), other$totalPrice = other.getTotalPrice();
        if ((this$totalPrice == null) ? (other$totalPrice != null) : !this$totalPrice.equals(other$totalPrice)) return false;
        Object this$hsnCode = getHsnCode(), other$hsnCode = other.getHsnCode();
        if ((this$hsnCode == null) ? (other$hsnCode != null) : !this$hsnCode.equals(other$hsnCode)) return false;
        Object this$unit = getUnit(), other$unit = other.getUnit();
        if ((this$unit == null) ? (other$unit != null) : !this$unit.equals(other$unit)) return false;
        Object this$gstPercentage = getGstPercentage(), other$gstPercentage = other.getGstPercentage();
        if ((this$gstPercentage == null) ? (other$gstPercentage != null) : !this$gstPercentage.equals(other$gstPercentage)) return false;
        Object this$cgstAmount = getCgstAmount(), other$cgstAmount = other.getCgstAmount();
        if ((this$cgstAmount == null) ? (other$cgstAmount != null) : !this$cgstAmount.equals(other$cgstAmount)) return false;
        Object this$sgstAmount = getSgstAmount(), other$sgstAmount = other.getSgstAmount();
        if ((this$sgstAmount == null) ? (other$sgstAmount != null) : !this$sgstAmount.equals(other$sgstAmount)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        return !((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof InvoiceItem;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $itemId = getItemId();
        result = result * PRIME + (($itemId == null) ? 43 : $itemId.hashCode());
        Object $invoice = getInvoice();
        result = result * PRIME + (($invoice == null) ? 43 : $invoice.hashCode());
        Object $product = getProduct();
        result = result * PRIME + (($product == null) ? 43 : $product.hashCode());
        Object $productName = getProductName();
        result = result * PRIME + (($productName == null) ? 43 : $productName.hashCode());
        Object $barcode = getBarcode();
        result = result * PRIME + (($barcode == null) ? 43 : $barcode.hashCode());
        Object $quantity = getQuantity();
        result = result * PRIME + (($quantity == null) ? 43 : $quantity.hashCode());
        Object $unitPrice = getUnitPrice();
        result = result * PRIME + (($unitPrice == null) ? 43 : $unitPrice.hashCode());
        Object $discountPercent = getDiscountPercent();
        result = result * PRIME + (($discountPercent == null) ? 43 : $discountPercent.hashCode());
        Object $discountAmount = getDiscountAmount();
        result = result * PRIME + (($discountAmount == null) ? 43 : $discountAmount.hashCode());
        Object $totalPrice = getTotalPrice();
        result = result * PRIME + (($totalPrice == null) ? 43 : $totalPrice.hashCode());
        Object $hsnCode = getHsnCode();
        result = result * PRIME + (($hsnCode == null) ? 43 : $hsnCode.hashCode());
        Object $unit = getUnit();
        result = result * PRIME + (($unit == null) ? 43 : $unit.hashCode());
        Object $gstPercentage = getGstPercentage();
        result = result * PRIME + (($gstPercentage == null) ? 43 : $gstPercentage.hashCode());
        Object $cgstAmount = getCgstAmount();
        result = result * PRIME + (($cgstAmount == null) ? 43 : $cgstAmount.hashCode());
        Object $sgstAmount = getSgstAmount();
        result = result * PRIME + (($sgstAmount == null) ? 43 : $sgstAmount.hashCode());
        Object $createdAt = getCreatedAt();
        return result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
    }

    @Override
    public String toString() {
        return "InvoiceItem(itemId=" + getItemId() + ", invoice=" + getInvoice() + ", product=" + getProduct() + ", productName=" + getProductName() + ", barcode=" + getBarcode() + ", quantity=" + getQuantity() + ", unitPrice=" + getUnitPrice() + ", discountPercent=" + getDiscountPercent() + ", discountAmount=" + getDiscountAmount() + ", totalPrice=" + getTotalPrice() + ", hsnCode=" + getHsnCode() + ", unit=" + getUnit() + ", gstPercentage=" + getGstPercentage() + ", cgstAmount=" + getCgstAmount() + ", sgstAmount=" + getSgstAmount() + ", createdAt=" + getCreatedAt() + ")";
    }
}
