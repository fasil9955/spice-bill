package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "expenses")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpenseRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "expense_id")
    private Integer expenseId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "account_type", nullable = false, length = 20)
    private String accountType;

    @Column(name = "employee_id")
    private Integer employeeId;

    @Column(name = "other_name", length = 200)
    private String otherName;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public ExpenseRecord() {}

    public ExpenseRecord(Integer expenseId, String companyName, String accountType, Integer employeeId, String otherName, BigDecimal amount, String paymentMethod, LocalDate expenseDate, LocalDateTime createdAt) {
        this.expenseId = expenseId;
        this.companyName = companyName;
        this.accountType = accountType;
        this.employeeId = employeeId;
        this.otherName = otherName;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.expenseDate = expenseDate;
        this.createdAt = createdAt;
    }

    public void setExpenseId(Integer expenseId) {
        this.expenseId = expenseId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public void setEmployeeId(Integer employeeId) {
        this.employeeId = employeeId;
    }

    public void setOtherName(String otherName) {
        this.otherName = otherName;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public void setExpenseDate(LocalDate expenseDate) {
        this.expenseDate = expenseDate;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getExpenseId() {
        return this.expenseId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public String getAccountType() {
        return this.accountType;
    }

    public Integer getEmployeeId() {
        return this.employeeId;
    }

    public String getOtherName() {
        return this.otherName;
    }

    public BigDecimal getAmount() {
        return this.amount;
    }

    public String getPaymentMethod() {
        return this.paymentMethod;
    }

    public LocalDate getExpenseDate() {
        return this.expenseDate;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @PrePersist
    protected void onCreate() {
        if (this.expenseDate == null) {
            this.expenseDate = LocalDate.now();
        }
        this.createdAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof ExpenseRecord)) return false;
        ExpenseRecord other = (ExpenseRecord) o;
        if (!other.canEqual(this)) return false;
        Object this$expenseId = getExpenseId(), other$expenseId = other.getExpenseId();
        if ((this$expenseId == null) ? (other$expenseId != null) : !this$expenseId.equals(other$expenseId)) return false;
        Object this$employeeId = getEmployeeId(), other$employeeId = other.getEmployeeId();
        if ((this$employeeId == null) ? (other$employeeId != null) : !this$employeeId.equals(other$employeeId)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$accountType = getAccountType(), other$accountType = other.getAccountType();
        if ((this$accountType == null) ? (other$accountType != null) : !this$accountType.equals(other$accountType)) return false;
        Object this$otherName = getOtherName(), other$otherName = other.getOtherName();
        if ((this$otherName == null) ? (other$otherName != null) : !this$otherName.equals(other$otherName)) return false;
        Object this$amount = getAmount(), other$amount = other.getAmount();
        if ((this$amount == null) ? (other$amount != null) : !this$amount.equals(other$amount)) return false;
        Object this$paymentMethod = getPaymentMethod(), other$paymentMethod = other.getPaymentMethod();
        if ((this$paymentMethod == null) ? (other$paymentMethod != null) : !this$paymentMethod.equals(other$paymentMethod)) return false;
        Object this$expenseDate = getExpenseDate(), other$expenseDate = other.getExpenseDate();
        if ((this$expenseDate == null) ? (other$expenseDate != null) : !this$expenseDate.equals(other$expenseDate)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        return !((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ExpenseRecord;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $expenseId = getExpenseId();
        result = result * PRIME + (($expenseId == null) ? 43 : $expenseId.hashCode());
        Object $employeeId = getEmployeeId();
        result = result * PRIME + (($employeeId == null) ? 43 : $employeeId.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $accountType = getAccountType();
        result = result * PRIME + (($accountType == null) ? 43 : $accountType.hashCode());
        Object $otherName = getOtherName();
        result = result * PRIME + (($otherName == null) ? 43 : $otherName.hashCode());
        Object $amount = getAmount();
        result = result * PRIME + (($amount == null) ? 43 : $amount.hashCode());
        Object $paymentMethod = getPaymentMethod();
        result = result * PRIME + (($paymentMethod == null) ? 43 : $paymentMethod.hashCode());
        Object $expenseDate = getExpenseDate();
        result = result * PRIME + (($expenseDate == null) ? 43 : $expenseDate.hashCode());
        Object $createdAt = getCreatedAt();
        return result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
    }

    @Override
    public String toString() {
        return "ExpenseRecord(expenseId=" + getExpenseId() + ", companyName=" + getCompanyName() + ", accountType=" + getAccountType() + ", employeeId=" + getEmployeeId() + ", otherName=" + getOtherName() + ", amount=" + getAmount() + ", paymentMethod=" + getPaymentMethod() + ", expenseDate=" + getExpenseDate() + ", createdAt=" + getCreatedAt() + ")";
    }
}
