package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_sales_report")
public class DailySalesReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Integer reportId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "total_invoices")
    private Integer totalInvoices;

    @Column(name = "total_sales", precision = 10, scale = 2)
    private BigDecimal totalSales;

    @Column(name = "total_tax", precision = 10, scale = 2)
    private BigDecimal totalTax;

    @Column(name = "total_discount", precision = 10, scale = 2)
    private BigDecimal totalDiscount;

    @Column(name = "total_items_sold")
    private Integer totalItemsSold;

    @Column(name = "cash_sales", precision = 10, scale = 2)
    private BigDecimal cashSales;

    @Column(name = "card_sales", precision = 10, scale = 2)
    private BigDecimal cardSales;

    @Column(name = "upi_sales", precision = 10, scale = 2)
    private BigDecimal upiSales;

    @Column(name = "mixed_sales", precision = 10, scale = 2)
    private BigDecimal mixedSales;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public DailySalesReport() {
        this.totalInvoices = 0;
        this.totalSales = BigDecimal.ZERO;
        this.totalTax = BigDecimal.ZERO;
        this.totalDiscount = BigDecimal.ZERO;
        this.totalItemsSold = 0;
        this.cashSales = BigDecimal.ZERO;
        this.cardSales = BigDecimal.ZERO;
        this.upiSales = BigDecimal.ZERO;
        this.mixedSales = BigDecimal.ZERO;
    }

    public DailySalesReport(Integer reportId, String companyName, LocalDate reportDate, Integer totalInvoices, BigDecimal totalSales, BigDecimal totalTax, BigDecimal totalDiscount, Integer totalItemsSold, BigDecimal cashSales, BigDecimal cardSales, BigDecimal upiSales, BigDecimal mixedSales, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.reportId = reportId;
        this.companyName = companyName;
        this.reportDate = reportDate;
        this.totalInvoices = totalInvoices != null ? totalInvoices : 0;
        this.totalSales = totalSales != null ? totalSales : BigDecimal.ZERO;
        this.totalTax = totalTax != null ? totalTax : BigDecimal.ZERO;
        this.totalDiscount = totalDiscount != null ? totalDiscount : BigDecimal.ZERO;
        this.totalItemsSold = totalItemsSold != null ? totalItemsSold : 0;
        this.cashSales = cashSales != null ? cashSales : BigDecimal.ZERO;
        this.cardSales = cardSales != null ? cardSales : BigDecimal.ZERO;
        this.upiSales = upiSales != null ? upiSales : BigDecimal.ZERO;
        this.mixedSales = mixedSales != null ? mixedSales : BigDecimal.ZERO;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void setReportId(Integer reportId) {
        this.reportId = reportId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
    }

    public void setTotalInvoices(Integer totalInvoices) {
        this.totalInvoices = totalInvoices;
    }

    public void setTotalSales(BigDecimal totalSales) {
        this.totalSales = totalSales;
    }

    public void setTotalTax(BigDecimal totalTax) {
        this.totalTax = totalTax;
    }

    public void setTotalDiscount(BigDecimal totalDiscount) {
        this.totalDiscount = totalDiscount;
    }

    public void setTotalItemsSold(Integer totalItemsSold) {
        this.totalItemsSold = totalItemsSold;
    }

    public void setCashSales(BigDecimal cashSales) {
        this.cashSales = cashSales;
    }

    public void setCardSales(BigDecimal cardSales) {
        this.cardSales = cardSales;
    }

    public void setUpiSales(BigDecimal upiSales) {
        this.upiSales = upiSales;
    }

    public void setMixedSales(BigDecimal mixedSales) {
        this.mixedSales = mixedSales;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getReportId() {
        return this.reportId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public LocalDate getReportDate() {
        return this.reportDate;
    }

    public Integer getTotalInvoices() {
        return this.totalInvoices;
    }

    public BigDecimal getTotalSales() {
        return this.totalSales;
    }

    public BigDecimal getMixedSales() {
        return this.mixedSales;
    }

    public BigDecimal getTotalTax() {
        return this.totalTax;
    }

    public BigDecimal getTotalDiscount() {
        return this.totalDiscount;
    }

    public Integer getTotalItemsSold() {
        return this.totalItemsSold;
    }

    public BigDecimal getCashSales() {
        return this.cashSales;
    }

    public BigDecimal getCardSales() {
        return this.cardSales;
    }

    public BigDecimal getUpiSales() {
        return this.upiSales;
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
        if (!(o instanceof DailySalesReport)) return false;
        DailySalesReport other = (DailySalesReport) o;
        if (!other.canEqual(this)) return false;
        Object this$reportId = getReportId(), other$reportId = other.getReportId();
        if ((this$reportId == null) ? (other$reportId != null) : !this$reportId.equals(other$reportId)) return false;
        Object this$totalInvoices = getTotalInvoices(), other$totalInvoices = other.getTotalInvoices();
        if ((this$totalInvoices == null) ? (other$totalInvoices != null) : !this$totalInvoices.equals(other$totalInvoices)) return false;
        Object this$totalItemsSold = getTotalItemsSold(), other$totalItemsSold = other.getTotalItemsSold();
        if ((this$totalItemsSold == null) ? (other$totalItemsSold != null) : !this$totalItemsSold.equals(other$totalItemsSold)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$reportDate = getReportDate(), other$reportDate = other.getReportDate();
        if ((this$reportDate == null) ? (other$reportDate != null) : !this$reportDate.equals(other$reportDate)) return false;
        Object this$totalSales = getTotalSales(), other$totalSales = other.getTotalSales();
        if ((this$totalSales == null) ? (other$totalSales != null) : !this$totalSales.equals(other$totalSales)) return false;
        Object this$totalTax = getTotalTax(), other$totalTax = other.getTotalTax();
        if ((this$totalTax == null) ? (other$totalTax != null) : !this$totalTax.equals(other$totalTax)) return false;
        Object this$totalDiscount = getTotalDiscount(), other$totalDiscount = other.getTotalDiscount();
        if ((this$totalDiscount == null) ? (other$totalDiscount != null) : !this$totalDiscount.equals(other$totalDiscount)) return false;
        Object this$cashSales = getCashSales(), other$cashSales = other.getCashSales();
        if ((this$cashSales == null) ? (other$cashSales != null) : !this$cashSales.equals(other$cashSales)) return false;
        Object this$cardSales = getCardSales(), other$cardSales = other.getCardSales();
        if ((this$cardSales == null) ? (other$cardSales != null) : !this$cardSales.equals(other$cardSales)) return false;
        Object this$upiSales = getUpiSales(), other$upiSales = other.getUpiSales();
        if ((this$upiSales == null) ? (other$upiSales != null) : !this$upiSales.equals(other$upiSales)) return false;
        Object this$mixedSales = getMixedSales(), other$mixedSales = other.getMixedSales();
        if ((this$mixedSales == null) ? (other$mixedSales != null) : !this$mixedSales.equals(other$mixedSales)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        return !((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof DailySalesReport;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $reportId = getReportId();
        result = result * PRIME + (($reportId == null) ? 43 : $reportId.hashCode());
        Object $totalInvoices = getTotalInvoices();
        result = result * PRIME + (($totalInvoices == null) ? 43 : $totalInvoices.hashCode());
        Object $totalItemsSold = getTotalItemsSold();
        result = result * PRIME + (($totalItemsSold == null) ? 43 : $totalItemsSold.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $reportDate = getReportDate();
        result = result * PRIME + (($reportDate == null) ? 43 : $reportDate.hashCode());
        Object $totalSales = getTotalSales();
        result = result * PRIME + (($totalSales == null) ? 43 : $totalSales.hashCode());
        Object $totalTax = getTotalTax();
        result = result * PRIME + (($totalTax == null) ? 43 : $totalTax.hashCode());
        Object $totalDiscount = getTotalDiscount();
        result = result * PRIME + (($totalDiscount == null) ? 43 : $totalDiscount.hashCode());
        Object $cashSales = getCashSales();
        result = result * PRIME + (($cashSales == null) ? 43 : $cashSales.hashCode());
        Object $cardSales = getCardSales();
        result = result * PRIME + (($cardSales == null) ? 43 : $cardSales.hashCode());
        Object $upiSales = getUpiSales();
        result = result * PRIME + (($upiSales == null) ? 43 : $upiSales.hashCode());
        Object $mixedSales = getMixedSales();
        result = result * PRIME + (($mixedSales == null) ? 43 : $mixedSales.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        return result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
    }

    @Override
    public String toString() {
        return "DailySalesReport(reportId=" + getReportId() + ", companyName=" + getCompanyName() + ", reportDate=" + getReportDate() + ", totalInvoices=" + getTotalInvoices() + ", totalSales=" + getTotalSales() + ", totalTax=" + getTotalTax() + ", totalDiscount=" + getTotalDiscount() + ", totalItemsSold=" + getTotalItemsSold() + ", cashSales=" + getCashSales() + ", cardSales=" + getCardSales() + ", upiSales=" + getUpiSales() + ", mixedSales=" + getMixedSales() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ")";
    }
}
