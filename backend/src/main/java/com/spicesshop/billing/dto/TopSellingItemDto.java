package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class TopSellingItemDto {
    private Integer productId;
    private String productName;
    private String barcode;
    private java.math.BigDecimal quantity;
    private java.math.BigDecimal totalRevenue;

    public TopSellingItemDto() {}

    public TopSellingItemDto(Integer productId, String productName, String barcode,
            java.math.BigDecimal quantity, java.math.BigDecimal totalRevenue) {
        this.productId = productId;
        this.productName = productName != null ? productName : "";
        this.barcode = barcode;
        this.quantity = quantity != null ? quantity : BigDecimal.ZERO;
        this.totalRevenue = totalRevenue != null ? totalRevenue : BigDecimal.ZERO;
    }

    public Integer getProductId() { return productId; }
    public void setProductId(Integer productId) { this.productId = productId; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }
    public java.math.BigDecimal getQuantity() { return quantity; }
    public void setQuantity(java.math.BigDecimal quantity) { this.quantity = quantity; }
    public java.math.BigDecimal getTotalRevenue() { return totalRevenue; }
    public void setTotalRevenue(java.math.BigDecimal totalRevenue) { this.totalRevenue = totalRevenue; }
}
