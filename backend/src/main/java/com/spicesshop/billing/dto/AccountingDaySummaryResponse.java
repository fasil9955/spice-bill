package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class AccountingDaySummaryResponse {
    private String reportDate;
    private BigDecimal billingBookSales;
    /** Opening CASH = yesterday's closing cash. */
    private BigDecimal openingCash;
    /** Opening UPI = yesterday's closing GPay total. */
    private BigDecimal openingUpi;
    /** This day's closing cash (saved Cash Balance). */
    private BigDecimal closingCash;
    /** This day's closing GPay total. */
    private BigDecimal closingGpayTotal;

    /** JSON string: manual card / UPI lines for this day. */
    private String paymentDetailsJson;

    public AccountingDaySummaryResponse() {}

    public AccountingDaySummaryResponse(String reportDate, BigDecimal billingBookSales) {
        this.reportDate = reportDate;
        this.billingBookSales = billingBookSales != null ? billingBookSales : BigDecimal.ZERO;
    }

    public AccountingDaySummaryResponse(String reportDate, BigDecimal billingBookSales,
            BigDecimal openingCash, BigDecimal openingUpi, BigDecimal closingCash, BigDecimal closingGpayTotal) {
        this.reportDate = reportDate;
        this.billingBookSales = billingBookSales != null ? billingBookSales : BigDecimal.ZERO;
        this.openingCash = openingCash != null ? openingCash : BigDecimal.ZERO;
        this.openingUpi = openingUpi != null ? openingUpi : BigDecimal.ZERO;
        this.closingCash = closingCash;
        this.closingGpayTotal = closingGpayTotal;
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

    public BigDecimal getOpeningCash() {
        return this.openingCash;
    }

    public void setOpeningCash(BigDecimal openingCash) {
        this.openingCash = openingCash;
    }

    public BigDecimal getOpeningUpi() {
        return this.openingUpi;
    }

    public void setOpeningUpi(BigDecimal openingUpi) {
        this.openingUpi = openingUpi;
    }

    public BigDecimal getClosingCash() {
        return this.closingCash;
    }

    public void setClosingCash(BigDecimal closingCash) {
        this.closingCash = closingCash;
    }

    public BigDecimal getClosingGpayTotal() {
        return this.closingGpayTotal;
    }

    public void setClosingGpayTotal(BigDecimal closingGpayTotal) {
        this.closingGpayTotal = closingGpayTotal;
    }

    public String getPaymentDetailsJson() {
        return this.paymentDetailsJson;
    }

    public void setPaymentDetailsJson(String paymentDetailsJson) {
        this.paymentDetailsJson = paymentDetailsJson;
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
