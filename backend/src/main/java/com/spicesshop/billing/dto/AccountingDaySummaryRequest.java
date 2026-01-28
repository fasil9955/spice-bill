package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class AccountingDaySummaryRequest {
    private BigDecimal billingBookSales;

    public AccountingDaySummaryRequest() {}

    public AccountingDaySummaryRequest(BigDecimal billingBookSales) {
        this.billingBookSales = billingBookSales;
    }

    public BigDecimal getBillingBookSales() {
        return this.billingBookSales;
    }

    public void setBillingBookSales(BigDecimal billingBookSales) {
        this.billingBookSales = billingBookSales;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof AccountingDaySummaryRequest)) return false;
        AccountingDaySummaryRequest other = (AccountingDaySummaryRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$billingBookSales = getBillingBookSales(), other$billingBookSales = other.getBillingBookSales();
        return !((this$billingBookSales == null) ? (other$billingBookSales != null) : !this$billingBookSales.equals(other$billingBookSales));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AccountingDaySummaryRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $billingBookSales = getBillingBookSales();
        return result * PRIME + (($billingBookSales == null) ? 43 : $billingBookSales.hashCode());
    }

    @Override
    public String toString() {
        return "AccountingDaySummaryRequest(billingBookSales=" + getBillingBookSales() + ")";
    }
}
