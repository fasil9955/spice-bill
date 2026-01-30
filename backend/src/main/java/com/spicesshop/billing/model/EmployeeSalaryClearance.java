package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "employee_salary_clearances", uniqueConstraints = {@UniqueConstraint(columnNames = {"company_name", "employee_id", "salary_month"})})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmployeeSalaryClearance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "salary_clearance_id")
    private Integer salaryClearanceId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "employee_id", nullable = false)
    private Integer employeeId;

    @Column(name = "salary_month", nullable = false, length = 7)
    private String salaryMonth;

    @Column(name = "salary_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal salaryAmount;

    @Column(name = "total_taken", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalTaken;

    @Column(name = "net_pay", nullable = false, precision = 12, scale = 2)
    private BigDecimal netPay;

    /** At month end: positive = employer to give employee, negative = employee to give employer. */
    @Column(name = "closing_balance", precision = 12, scale = 2)
    private BigDecimal closingBalance;

    @Column(name = "cleared_at")
    private LocalDateTime clearedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public EmployeeSalaryClearance() {}

    public EmployeeSalaryClearance(Integer salaryClearanceId, String companyName, Integer employeeId, String salaryMonth, BigDecimal salaryAmount, BigDecimal totalTaken, BigDecimal netPay, LocalDateTime clearedAt, LocalDateTime createdAt) {
        this.salaryClearanceId = salaryClearanceId;
        this.companyName = companyName;
        this.employeeId = employeeId;
        this.salaryMonth = salaryMonth;
        this.salaryAmount = salaryAmount;
        this.totalTaken = totalTaken;
        this.netPay = netPay;
        this.clearedAt = clearedAt;
        this.createdAt = createdAt;
    }

    public void setSalaryClearanceId(Integer salaryClearanceId) {
        this.salaryClearanceId = salaryClearanceId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setEmployeeId(Integer employeeId) {
        this.employeeId = employeeId;
    }

    public void setSalaryMonth(String salaryMonth) {
        this.salaryMonth = salaryMonth;
    }

    public void setSalaryAmount(BigDecimal salaryAmount) {
        this.salaryAmount = salaryAmount;
    }

    public void setTotalTaken(BigDecimal totalTaken) {
        this.totalTaken = totalTaken;
    }

    public void setNetPay(BigDecimal netPay) {
        this.netPay = netPay;
    }

    public BigDecimal getClosingBalance() {
        return this.closingBalance;
    }

    public void setClosingBalance(BigDecimal closingBalance) {
        this.closingBalance = closingBalance;
    }

    public void setClearedAt(LocalDateTime clearedAt) {
        this.clearedAt = clearedAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getSalaryClearanceId() {
        return this.salaryClearanceId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public Integer getEmployeeId() {
        return this.employeeId;
    }

    public String getSalaryMonth() {
        return this.salaryMonth;
    }

    public BigDecimal getSalaryAmount() {
        return this.salaryAmount;
    }

    public BigDecimal getTotalTaken() {
        return this.totalTaken;
    }

    public BigDecimal getNetPay() {
        return this.netPay;
    }

    public LocalDateTime getClearedAt() {
        return this.clearedAt;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.clearedAt == null) {
            this.clearedAt = LocalDateTime.now();
        }
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof EmployeeSalaryClearance)) return false;
        EmployeeSalaryClearance other = (EmployeeSalaryClearance) o;
        if (!other.canEqual(this)) return false;
        Object this$salaryClearanceId = getSalaryClearanceId(), other$salaryClearanceId = other.getSalaryClearanceId();
        if ((this$salaryClearanceId == null) ? (other$salaryClearanceId != null) : !this$salaryClearanceId.equals(other$salaryClearanceId)) return false;
        Object this$employeeId = getEmployeeId(), other$employeeId = other.getEmployeeId();
        if ((this$employeeId == null) ? (other$employeeId != null) : !this$employeeId.equals(other$employeeId)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$salaryMonth = getSalaryMonth(), other$salaryMonth = other.getSalaryMonth();
        if ((this$salaryMonth == null) ? (other$salaryMonth != null) : !this$salaryMonth.equals(other$salaryMonth)) return false;
        Object this$salaryAmount = getSalaryAmount(), other$salaryAmount = other.getSalaryAmount();
        if ((this$salaryAmount == null) ? (other$salaryAmount != null) : !this$salaryAmount.equals(other$salaryAmount)) return false;
        Object this$totalTaken = getTotalTaken(), other$totalTaken = other.getTotalTaken();
        if ((this$totalTaken == null) ? (other$totalTaken != null) : !this$totalTaken.equals(other$totalTaken)) return false;
        Object this$netPay = getNetPay(), other$netPay = other.getNetPay();
        if ((this$netPay == null) ? (other$netPay != null) : !this$netPay.equals(other$netPay)) return false;
        Object this$clearedAt = getClearedAt(), other$clearedAt = other.getClearedAt();
        if ((this$clearedAt == null) ? (other$clearedAt != null) : !this$clearedAt.equals(other$clearedAt)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        return !((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EmployeeSalaryClearance;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $salaryClearanceId = getSalaryClearanceId();
        result = result * PRIME + (($salaryClearanceId == null) ? 43 : $salaryClearanceId.hashCode());
        Object $employeeId = getEmployeeId();
        result = result * PRIME + (($employeeId == null) ? 43 : $employeeId.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $salaryMonth = getSalaryMonth();
        result = result * PRIME + (($salaryMonth == null) ? 43 : $salaryMonth.hashCode());
        Object $salaryAmount = getSalaryAmount();
        result = result * PRIME + (($salaryAmount == null) ? 43 : $salaryAmount.hashCode());
        Object $totalTaken = getTotalTaken();
        result = result * PRIME + (($totalTaken == null) ? 43 : $totalTaken.hashCode());
        Object $netPay = getNetPay();
        result = result * PRIME + (($netPay == null) ? 43 : $netPay.hashCode());
        Object $clearedAt = getClearedAt();
        result = result * PRIME + (($clearedAt == null) ? 43 : $clearedAt.hashCode());
        Object $createdAt = getCreatedAt();
        return result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
    }

    @Override
    public String toString() {
        return "EmployeeSalaryClearance(salaryClearanceId=" + getSalaryClearanceId() + ", companyName=" + getCompanyName() + ", employeeId=" + getEmployeeId() + ", salaryMonth=" + getSalaryMonth() + ", salaryAmount=" + getSalaryAmount() + ", totalTaken=" + getTotalTaken() + ", netPay=" + getNetPay() + ", clearedAt=" + getClearedAt() + ", createdAt=" + getCreatedAt() + ")";
    }
}
