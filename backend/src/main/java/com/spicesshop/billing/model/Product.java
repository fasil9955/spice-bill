package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "products")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Integer productId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "product_code", nullable = false)
    private String productCode;

    @Column(name = "barcode", nullable = false)
    private String barcode;

    @Column(name = "selling_price_per_unit", nullable = false, precision = 10, scale = 2)
    private BigDecimal sellingPricePerUnit;

    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(name = "packaging_type", length = 50)
    private String packagingType;

    @Column(name = "unit", length = 20)
    private String unit;

    // Text shown on barcode/sticker for USP/claim.
    @Column(name = "usp", columnDefinition = "TEXT")
    private String usp;

    // Ingredient list shown on barcode/sticker.
    @Column(name = "ingredients", columnDefinition = "TEXT")
    private String ingredients;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 6)
    private BigDecimal quantity;

    @Column(name = "min_stock_level", precision = 12, scale = 6)
    private BigDecimal minStockLevel;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Product() {
        this.quantity = BigDecimal.ZERO;
        this.minStockLevel = BigDecimal.ZERO;
        this.isActive = true;
    }

    public Product(Integer productId, String companyName, String productName, Category category, String productCode, String barcode, BigDecimal sellingPricePerUnit, String hsnCode, String packagingType, String unit, BigDecimal quantity, BigDecimal minStockLevel, Boolean isActive, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.productId = productId;
        this.companyName = companyName;
        this.productName = productName;
        this.category = category;
        this.productCode = productCode;
        this.barcode = barcode;
        this.sellingPricePerUnit = sellingPricePerUnit;
        this.hsnCode = hsnCode;
        this.packagingType = packagingType;
        this.unit = unit;
        this.usp = null;
        this.ingredients = null;
        this.quantity = quantity != null ? quantity : BigDecimal.ZERO;
        this.minStockLevel = minStockLevel != null ? minStockLevel : BigDecimal.ZERO;
        this.isActive = isActive != null ? isActive : true;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void setProductId(Integer productId) {
        this.productId = productId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public void setProductCode(String productCode) {
        this.productCode = productCode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public void setSellingPricePerUnit(BigDecimal sellingPricePerUnit) {
        this.sellingPricePerUnit = sellingPricePerUnit;
    }

    public void setHsnCode(String hsnCode) {
        this.hsnCode = hsnCode;
    }

    public void setPackagingType(String packagingType) {
        this.packagingType = packagingType;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public void setUsp(String usp) {
        this.usp = usp;
    }

    public void setIngredients(String ingredients) {
        this.ingredients = ingredients;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public void setMinStockLevel(BigDecimal minStockLevel) {
        this.minStockLevel = minStockLevel;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getProductId() {
        return this.productId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public String getProductName() {
        return this.productName;
    }

    public Category getCategory() {
        return this.category;
    }

    public String getProductCode() {
        return this.productCode;
    }

    public String getBarcode() {
        return this.barcode;
    }

    public Boolean getIsActive() {
        return this.isActive;
    }

    public BigDecimal getSellingPricePerUnit() {
        return this.sellingPricePerUnit;
    }

    public String getHsnCode() {
        return this.hsnCode;
    }

    public String getPackagingType() {
        return this.packagingType;
    }

    public String getUnit() {
        return this.unit;
    }

    public String getUsp() {
        return this.usp;
    }

    public String getIngredients() {
        return this.ingredients;
    }

    public BigDecimal getQuantity() {
        return this.quantity;
    }

    public BigDecimal getMinStockLevel() {
        return this.minStockLevel;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
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
        if (!(o instanceof Product)) return false;
        Product other = (Product) o;
        if (!other.canEqual(this)) return false;
        Object this$productId = getProductId(), other$productId = other.getProductId();
        if ((this$productId == null) ? (other$productId != null) : !this$productId.equals(other$productId)) return false;
        Object this$isActive = getIsActive(), other$isActive = other.getIsActive();
        if ((this$isActive == null) ? (other$isActive != null) : !this$isActive.equals(other$isActive)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$productName = getProductName(), other$productName = other.getProductName();
        if ((this$productName == null) ? (other$productName != null) : !this$productName.equals(other$productName)) return false;
        Object this$category = getCategory(), other$category = other.getCategory();
        if ((this$category == null) ? (other$category != null) : !this$category.equals(other$category)) return false;
        Object this$productCode = getProductCode(), other$productCode = other.getProductCode();
        if ((this$productCode == null) ? (other$productCode != null) : !this$productCode.equals(other$productCode)) return false;
        Object this$barcode = getBarcode(), other$barcode = other.getBarcode();
        if ((this$barcode == null) ? (other$barcode != null) : !this$barcode.equals(other$barcode)) return false;
        Object this$sellingPricePerUnit = getSellingPricePerUnit(), other$sellingPricePerUnit = other.getSellingPricePerUnit();
        if ((this$sellingPricePerUnit == null) ? (other$sellingPricePerUnit != null) : !this$sellingPricePerUnit.equals(other$sellingPricePerUnit)) return false;
        Object this$hsnCode = getHsnCode(), other$hsnCode = other.getHsnCode();
        if ((this$hsnCode == null) ? (other$hsnCode != null) : !this$hsnCode.equals(other$hsnCode)) return false;
        Object this$packagingType = getPackagingType(), other$packagingType = other.getPackagingType();
        if ((this$packagingType == null) ? (other$packagingType != null) : !this$packagingType.equals(other$packagingType)) return false;
        Object this$unit = getUnit(), other$unit = other.getUnit();
        if ((this$unit == null) ? (other$unit != null) : !this$unit.equals(other$unit)) return false;
        Object this$quantity = getQuantity(), other$quantity = other.getQuantity();
        if ((this$quantity == null) ? (other$quantity != null) : !this$quantity.equals(other$quantity)) return false;
        Object this$minStockLevel = getMinStockLevel(), other$minStockLevel = other.getMinStockLevel();
        if ((this$minStockLevel == null) ? (other$minStockLevel != null) : !this$minStockLevel.equals(other$minStockLevel)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        return !((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Product;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $productId = getProductId();
        result = result * PRIME + (($productId == null) ? 43 : $productId.hashCode());
        Object $isActive = getIsActive();
        result = result * PRIME + (($isActive == null) ? 43 : $isActive.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $productName = getProductName();
        result = result * PRIME + (($productName == null) ? 43 : $productName.hashCode());
        Object $category = getCategory();
        result = result * PRIME + (($category == null) ? 43 : $category.hashCode());
        Object $productCode = getProductCode();
        result = result * PRIME + (($productCode == null) ? 43 : $productCode.hashCode());
        Object $barcode = getBarcode();
        result = result * PRIME + (($barcode == null) ? 43 : $barcode.hashCode());
        Object $sellingPricePerUnit = getSellingPricePerUnit();
        result = result * PRIME + (($sellingPricePerUnit == null) ? 43 : $sellingPricePerUnit.hashCode());
        Object $hsnCode = getHsnCode();
        result = result * PRIME + (($hsnCode == null) ? 43 : $hsnCode.hashCode());
        Object $packagingType = getPackagingType();
        result = result * PRIME + (($packagingType == null) ? 43 : $packagingType.hashCode());
        Object $unit = getUnit();
        result = result * PRIME + (($unit == null) ? 43 : $unit.hashCode());
        Object $quantity = getQuantity();
        result = result * PRIME + (($quantity == null) ? 43 : $quantity.hashCode());
        Object $minStockLevel = getMinStockLevel();
        result = result * PRIME + (($minStockLevel == null) ? 43 : $minStockLevel.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        return result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
    }

    @Override
    public String toString() {
        return "Product(productId=" + getProductId() + ", companyName=" + getCompanyName() + ", productName=" + getProductName() + ", category=" + getCategory() + ", productCode=" + getProductCode() + ", barcode=" + getBarcode() + ", sellingPricePerUnit=" + getSellingPricePerUnit() + ", hsnCode=" + getHsnCode() + ", packagingType=" + getPackagingType() + ", unit=" + getUnit() + ", quantity=" + getQuantity() + ", minStockLevel=" + getMinStockLevel() + ", isActive=" + getIsActive() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ")";
    }
}
