package com.spicesshop.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "b2c_gst_split", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"company_name", "year", "month"})
})
public class B2cGstSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(nullable = false)
    private Integer year;

    @Column(nullable = false)
    private Integer month;

    @Column(name = "taxable_5", precision = 12, scale = 2, nullable = false)
    private BigDecimal taxable5 = BigDecimal.ZERO;

    @Column(name = "taxable_18", precision = 12, scale = 2, nullable = false)
    private BigDecimal taxable18 = BigDecimal.ZERO;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }
    public Integer getMonth() { return month; }
    public void setMonth(Integer month) { this.month = month; }
    public BigDecimal getTaxable5() { return taxable5; }
    public void setTaxable5(BigDecimal taxable5) { this.taxable5 = taxable5; }
    public BigDecimal getTaxable18() { return taxable18; }
    public void setTaxable18(BigDecimal taxable18) { this.taxable18 = taxable18; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
