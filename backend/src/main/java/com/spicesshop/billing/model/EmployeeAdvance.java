package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "employee_advances")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmployeeAdvance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "advance_id")
    private Integer advanceId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "employee_id", nullable = false)
    private Integer employeeId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public EmployeeAdvance() {}

    public EmployeeAdvance(Integer advanceId, String companyName, Integer employeeId, BigDecimal amount, String paymentMethod, LocalDate recordDate, LocalDateTime createdAt) {
        this.advanceId = advanceId;
        this.companyName = companyName;
        this.employeeId = employeeId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.recordDate = recordDate;
        this.createdAt = createdAt;
    }

    public void setAdvanceId(Integer advanceId) {
        this.advanceId = advanceId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setEmployeeId(Integer employeeId) {
        this.employeeId = employeeId;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public void setRecordDate(LocalDate recordDate) {
        this.recordDate = recordDate;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getAdvanceId() {
        return this.advanceId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public Integer getEmployeeId() {
        return this.employeeId;
    }

    public BigDecimal getAmount() {
        return this.amount;
    }

    public String getPaymentMethod() {
        return this.paymentMethod;
    }

    public LocalDate getRecordDate() {
        return this.recordDate;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @PrePersist
    protected void onCreate() {
        if (this.recordDate == null) {
            this.recordDate = LocalDate.now();
        }
        this.createdAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof EmployeeAdvance)) return false;
        EmployeeAdvance other = (EmployeeAdvance) o;
        if (!other.canEqual(this)) return false;
        Object this$advanceId = getAdvanceId(), other$advanceId = other.getAdvanceId();
        if ((this$advanceId == null) ? (other$advanceId != null) : !this$advanceId.equals(other$advanceId)) return false;
        Object this$employeeId = getEmployeeId(), other$employeeId = other.getEmployeeId();
        if ((this$employeeId == null) ? (other$employeeId != null) : !this$employeeId.equals(other$employeeId)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$amount = getAmount(), other$amount = other.getAmount();
        if ((this$amount == null) ? (other$amount != null) : !this$amount.equals(other$amount)) return false;
        Object this$paymentMethod = getPaymentMethod(), other$paymentMethod = other.getPaymentMethod();
        if ((this$paymentMethod == null) ? (other$paymentMethod != null) : !this$paymentMethod.equals(other$paymentMethod)) return false;
        Object this$recordDate = getRecordDate(), other$recordDate = other.getRecordDate();
        if ((this$recordDate == null) ? (other$recordDate != null) : !this$recordDate.equals(other$recordDate)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        return !((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EmployeeAdvance;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $advanceId = getAdvanceId();
        result = result * PRIME + (($advanceId == null) ? 43 : $advanceId.hashCode());
        Object $employeeId = getEmployeeId();
        result = result * PRIME + (($employeeId == null) ? 43 : $employeeId.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $amount = getAmount();
        result = result * PRIME + (($amount == null) ? 43 : $amount.hashCode());
        Object $paymentMethod = getPaymentMethod();
        result = result * PRIME + (($paymentMethod == null) ? 43 : $paymentMethod.hashCode());
        Object $recordDate = getRecordDate();
        result = result * PRIME + (($recordDate == null) ? 43 : $recordDate.hashCode());
        Object $createdAt = getCreatedAt();
        return result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
    }

    @Override
    public String toString() {
        return "EmployeeAdvance(advanceId=" + getAdvanceId() + ", companyName=" + getCompanyName() + ", employeeId=" + getEmployeeId() + ", amount=" + getAmount() + ", paymentMethod=" + getPaymentMethod() + ", recordDate=" + getRecordDate() + ", createdAt=" + getCreatedAt() + ")";
    }
}
