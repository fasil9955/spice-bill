package com.spicesshop.billing.dto;

import com.spicesshop.billing.model.Product;
import java.math.BigDecimal;

public class BarcodeParseResult {
    private Product product;
    private BigDecimal weight;
    private String baseBarcode;
    private String fullBarcode;

    public BarcodeParseResult() {}

    public BarcodeParseResult(Product product, BigDecimal weight, String baseBarcode, String fullBarcode) {
        this.product = product;
        this.weight = weight;
        this.baseBarcode = baseBarcode;
        this.fullBarcode = fullBarcode;
    }

    public Product getProduct() {
        return this.product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public BigDecimal getWeight() {
        return this.weight;
    }

    public void setWeight(BigDecimal weight) {
        this.weight = weight;
    }

    public String getBaseBarcode() {
        return this.baseBarcode;
    }

    public void setBaseBarcode(String baseBarcode) {
        this.baseBarcode = baseBarcode;
    }

    public String getFullBarcode() {
        return this.fullBarcode;
    }

    public void setFullBarcode(String fullBarcode) {
        this.fullBarcode = fullBarcode;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof BarcodeParseResult)) return false;
        BarcodeParseResult other = (BarcodeParseResult) o;
        if (!other.canEqual(this)) return false;
        Object this$product = getProduct(), other$product = other.getProduct();
        if ((this$product == null) ? (other$product != null) : !this$product.equals(other$product)) return false;
        Object this$weight = getWeight(), other$weight = other.getWeight();
        if ((this$weight == null) ? (other$weight != null) : !this$weight.equals(other$weight)) return false;
        Object this$baseBarcode = getBaseBarcode(), other$baseBarcode = other.getBaseBarcode();
        if ((this$baseBarcode == null) ? (other$baseBarcode != null) : !this$baseBarcode.equals(other$baseBarcode)) return false;
        Object this$fullBarcode = getFullBarcode(), other$fullBarcode = other.getFullBarcode();
        return !((this$fullBarcode == null) ? (other$fullBarcode != null) : !this$fullBarcode.equals(other$fullBarcode));
    }

    protected boolean canEqual(Object other) {
        return other instanceof BarcodeParseResult;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $product = getProduct();
        result = result * PRIME + (($product == null) ? 43 : $product.hashCode());
        Object $weight = getWeight();
        result = result * PRIME + (($weight == null) ? 43 : $weight.hashCode());
        Object $baseBarcode = getBaseBarcode();
        result = result * PRIME + (($baseBarcode == null) ? 43 : $baseBarcode.hashCode());
        Object $fullBarcode = getFullBarcode();
        result = result * PRIME + (($fullBarcode == null) ? 43 : $fullBarcode.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "BarcodeParseResult(product=" + getProduct() + ", weight=" + getWeight() + ", baseBarcode=" + getBaseBarcode() + ", fullBarcode=" + getFullBarcode() + ")";
    }
}
