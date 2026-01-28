package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "monthly_sales_summary", uniqueConstraints = {@UniqueConstraint(columnNames = {"company_name", "year", "month"})})
public class MonthlySalesSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "summary_id")
    private Integer summaryId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "month", nullable = false)
    private Integer month;

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

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public MonthlySalesSummary() {
        this.totalInvoices = 0;
        this.totalSales = BigDecimal.ZERO;
        this.totalTax = BigDecimal.ZERO;
        this.totalDiscount = BigDecimal.ZERO;
        this.totalItemsSold = 0;
    }

    public MonthlySalesSummary(Integer summaryId, String companyName, Integer year, Integer month, Integer totalInvoices, BigDecimal totalSales, BigDecimal totalTax, BigDecimal totalDiscount, Integer totalItemsSold, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.summaryId = summaryId;
        this.companyName = companyName;
        this.year = year;
        this.month = month;
        this.totalInvoices = totalInvoices != null ? totalInvoices : 0;
        this.totalSales = totalSales != null ? totalSales : BigDecimal.ZERO;
        this.totalTax = totalTax != null ? totalTax : BigDecimal.ZERO;
        this.totalDiscount = totalDiscount != null ? totalDiscount : BigDecimal.ZERO;
        this.totalItemsSold = totalItemsSold != null ? totalItemsSold : 0;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void setSummaryId(Integer summaryId) {
        this.summaryId = summaryId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public void setMonth(Integer month) {
        this.month = month;
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

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getSummaryId() {
        return this.summaryId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public Integer getYear() {
        return this.year;
    }

    public Integer getMonth() {
        return this.month;
    }

    public Integer getTotalItemsSold() {
        return this.totalItemsSold;
    }

    public Integer getTotalInvoices() {
        return this.totalInvoices;
    }

    public BigDecimal getTotalSales() {
        return this.totalSales;
    }

    public BigDecimal getTotalTax() {
        return this.totalTax;
    }

    public BigDecimal getTotalDiscount() {
        return this.totalDiscount;
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
        if (!(o instanceof MonthlySalesSummary)) return false;
        MonthlySalesSummary other = (MonthlySalesSummary) o;
        if (!other.canEqual(this)) return false;
        Object this$summaryId = getSummaryId(), other$summaryId = other.getSummaryId();
        if ((this$summaryId == null) ? (other$summaryId != null) : !this$summaryId.equals(other$summaryId)) return false;
        Object this$year = getYear(), other$year = other.getYear();
        if ((this$year == null) ? (other$year != null) : !this$year.equals(other$year)) return false;
        Object this$month = getMonth(), other$month = other.getMonth();
        if ((this$month == null) ? (other$month != null) : !this$month.equals(other$month)) return false;
        Object this$totalInvoices = getTotalInvoices(), other$totalInvoices = other.getTotalInvoices();
        if ((this$totalInvoices == null) ? (other$totalInvoices != null) : !this$totalInvoices.equals(other$totalInvoices)) return false;
        Object this$totalItemsSold = getTotalItemsSold(), other$totalItemsSold = other.getTotalItemsSold();
        if ((this$totalItemsSold == null) ? (other$totalItemsSold != null) : !this$totalItemsSold.equals(other$totalItemsSold)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$totalSales = getTotalSales(), other$totalSales = other.getTotalSales();
        if ((this$totalSales == null) ? (other$totalSales != null) : !this$totalSales.equals(other$totalSales)) return false;
        Object this$totalTax = getTotalTax(), other$totalTax = other.getTotalTax();
        if ((this$totalTax == null) ? (other$totalTax != null) : !this$totalTax.equals(other$totalTax)) return false;
        Object this$totalDiscount = getTotalDiscount(), other$totalDiscount = other.getTotalDiscount();
        if ((this$totalDiscount == null) ? (other$totalDiscount != null) : !this$totalDiscount.equals(other$totalDiscount)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        return !((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof MonthlySalesSummary;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $summaryId = getSummaryId();
        result = result * PRIME + (($summaryId == null) ? 43 : $summaryId.hashCode());
        Object $year = getYear();
        result = result * PRIME + (($year == null) ? 43 : $year.hashCode());
        Object $month = getMonth();
        result = result * PRIME + (($month == null) ? 43 : $month.hashCode());
        Object $totalInvoices = getTotalInvoices();
        result = result * PRIME + (($totalInvoices == null) ? 43 : $totalInvoices.hashCode());
        Object $totalItemsSold = getTotalItemsSold();
        result = result * PRIME + (($totalItemsSold == null) ? 43 : $totalItemsSold.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $totalSales = getTotalSales();
        result = result * PRIME + (($totalSales == null) ? 43 : $totalSales.hashCode());
        Object $totalTax = getTotalTax();
        result = result * PRIME + (($totalTax == null) ? 43 : $totalTax.hashCode());
        Object $totalDiscount = getTotalDiscount();
        result = result * PRIME + (($totalDiscount == null) ? 43 : $totalDiscount.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        return result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
    }

    @Override
    public String toString() {
        return "MonthlySalesSummary(summaryId=" + getSummaryId() + ", companyName=" + getCompanyName() + ", year=" + getYear() + ", month=" + getMonth() + ", totalInvoices=" + getTotalInvoices() + ", totalSales=" + getTotalSales() + ", totalTax=" + getTotalTax() + ", totalDiscount=" + getTotalDiscount() + ", totalItemsSold=" + getTotalItemsSold() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ")";
    }
}
