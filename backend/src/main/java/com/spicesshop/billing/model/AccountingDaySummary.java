package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "accounting_day_summary", uniqueConstraints = {@UniqueConstraint(columnNames = {"company_name", "report_date"})})
public class AccountingDaySummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "summary_id")
    private Long summaryId;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "billing_book_sales", precision = 12, scale = 2)
    private BigDecimal billingBookSales;

    @Column(name = "closing_cash", precision = 12, scale = 2)
    private BigDecimal closingCash;

    @Column(name = "closing_gpay_total", precision = 12, scale = 2)
    private BigDecimal closingGpayTotal;

    /** JSON: {"cards":[{"name":"...","amount":"..."}],"upis":[...]} */
    @Column(name = "payment_details_json", columnDefinition = "TEXT")
    private String paymentDetailsJson;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public AccountingDaySummary() {}

    public AccountingDaySummary(Long summaryId, String companyName, LocalDate reportDate, BigDecimal billingBookSales, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.summaryId = summaryId;
        this.companyName = companyName;
        this.reportDate = reportDate;
        this.billingBookSales = billingBookSales;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void setSummaryId(Long summaryId) {
        this.summaryId = summaryId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
    }

    public void setBillingBookSales(BigDecimal billingBookSales) {
        this.billingBookSales = billingBookSales;
    }

    public void setClosingCash(BigDecimal closingCash) {
        this.closingCash = closingCash;
    }

    public void setClosingGpayTotal(BigDecimal closingGpayTotal) {
        this.closingGpayTotal = closingGpayTotal;
    }

    public void setPaymentDetailsJson(String paymentDetailsJson) {
        this.paymentDetailsJson = paymentDetailsJson;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Long getSummaryId() {
        return this.summaryId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public LocalDate getReportDate() {
        return this.reportDate;
    }

    public BigDecimal getBillingBookSales() {
        return this.billingBookSales;
    }

    public BigDecimal getClosingCash() {
        return this.closingCash;
    }

    public BigDecimal getClosingGpayTotal() {
        return this.closingGpayTotal;
    }

    public String getPaymentDetailsJson() {
        return this.paymentDetailsJson;
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
        if (!(o instanceof AccountingDaySummary)) return false;
        AccountingDaySummary other = (AccountingDaySummary) o;
        if (!other.canEqual(this)) return false;
        Object this$summaryId = getSummaryId(), other$summaryId = other.getSummaryId();
        if ((this$summaryId == null) ? (other$summaryId != null) : !this$summaryId.equals(other$summaryId)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$reportDate = getReportDate(), other$reportDate = other.getReportDate();
        if ((this$reportDate == null) ? (other$reportDate != null) : !this$reportDate.equals(other$reportDate)) return false;
        Object this$billingBookSales = getBillingBookSales(), other$billingBookSales = other.getBillingBookSales();
        if ((this$billingBookSales == null) ? (other$billingBookSales != null) : !this$billingBookSales.equals(other$billingBookSales)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        return !((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof AccountingDaySummary;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $summaryId = getSummaryId();
        result = result * PRIME + (($summaryId == null) ? 43 : $summaryId.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $reportDate = getReportDate();
        result = result * PRIME + (($reportDate == null) ? 43 : $reportDate.hashCode());
        Object $billingBookSales = getBillingBookSales();
        result = result * PRIME + (($billingBookSales == null) ? 43 : $billingBookSales.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        result = result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "AccountingDaySummary(summaryId=" + getSummaryId() + ", companyName=" + getCompanyName() + ", reportDate=" + getReportDate() + ", billingBookSales=" + getBillingBookSales() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ")";
    }
}

