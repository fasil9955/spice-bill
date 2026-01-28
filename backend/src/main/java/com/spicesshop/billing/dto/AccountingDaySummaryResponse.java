package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class AccountingDaySummaryResponse {
    private String reportDate;
    private BigDecimal billingBookSales;

    public AccountingDaySummaryResponse() {}

    public AccountingDaySummaryResponse(String reportDate, BigDecimal billingBookSales) {
        this.reportDate = reportDate;
        this.billingBookSales = billingBookSales;
    }

    public String getReportDate() {
        return this.reportDate;
    }

    public void setReportDate(String reportDate) {
        this.reportDate = reportDate;
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
        if (!(o instanceof AccountingDaySummaryResponse)) return false;
        AccountingDaySummaryResponse other = (AccountingDaySummaryResponse) o;
        if (!other.canEqual(this)) return false;
        Object this$reportDate = getReportDate(), other$reportDate = other.getReportDate();
        if ((this$reportDate == null) ? (other$reportDate != null) : !this$reportDate.equals(other$reportDate)) return false;
        Object this$billingBookSales = getBillingBookSales(), other$billingBookSales = other.getBillingBookSales();
        return !((this$billingBookSales == null) ? (other$billingBookSales != null) : !this$billingBookSales.equals(other$billingBookSales));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AccountingDaySummaryResponse;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $reportDate = getReportDate();
        result = result * PRIME + (($reportDate == null) ? 43 : $reportDate.hashCode());
        Object $billingBookSales = getBillingBookSales();
        result = result * PRIME + (($billingBookSales == null) ? 43 : $billingBookSales.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "AccountingDaySummaryResponse(reportDate=" + getReportDate() + ", billingBookSales=" + getBillingBookSales() + ")";
    }
}
