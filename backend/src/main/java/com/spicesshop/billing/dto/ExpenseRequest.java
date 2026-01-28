package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class ExpenseRequest {
    private String accountType;
    private Integer employeeId;
    private String otherName;
    private BigDecimal amount;
    private String paymentMethod;
    private String expenseDate;

    public ExpenseRequest() {}

    public ExpenseRequest(String accountType, Integer employeeId, String otherName, BigDecimal amount, String paymentMethod, String expenseDate) {
        this.accountType = accountType;
        this.employeeId = employeeId;
        this.otherName = otherName;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.expenseDate = expenseDate;
    }

    public String getAccountType() {
        return this.accountType;
    }

    public void setAccountType(String accountType) {
        this.accountType = accountType;
    }

    public Integer getEmployeeId() {
        return this.employeeId;
    }

    public void setEmployeeId(Integer employeeId) {
        this.employeeId = employeeId;
    }

    public String getOtherName() {
        return this.otherName;
    }

    public void setOtherName(String otherName) {
        this.otherName = otherName;
    }

    public BigDecimal getAmount() {
        return this.amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getPaymentMethod() {
        return this.paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getExpenseDate() {
        return this.expenseDate;
    }

    public void setExpenseDate(String expenseDate) {
        this.expenseDate = expenseDate;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof ExpenseRequest)) return false;
        ExpenseRequest other = (ExpenseRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$employeeId = getEmployeeId(), other$employeeId = other.getEmployeeId();
        if ((this$employeeId == null) ? (other$employeeId != null) : !this$employeeId.equals(other$employeeId)) return false;
        Object this$accountType = getAccountType(), other$accountType = other.getAccountType();
        if ((this$accountType == null) ? (other$accountType != null) : !this$accountType.equals(other$accountType)) return false;
        Object this$otherName = getOtherName(), other$otherName = other.getOtherName();
        if ((this$otherName == null) ? (other$otherName != null) : !this$otherName.equals(other$otherName)) return false;
        Object this$amount = getAmount(), other$amount = other.getAmount();
        if ((this$amount == null) ? (other$amount != null) : !this$amount.equals(other$amount)) return false;
        Object this$paymentMethod = getPaymentMethod(), other$paymentMethod = other.getPaymentMethod();
        if ((this$paymentMethod == null) ? (other$paymentMethod != null) : !this$paymentMethod.equals(other$paymentMethod)) return false;
        Object this$expenseDate = getExpenseDate(), other$expenseDate = other.getExpenseDate();
        return !((this$expenseDate == null) ? (other$expenseDate != null) : !this$expenseDate.equals(other$expenseDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ExpenseRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $employeeId = getEmployeeId();
        result = result * PRIME + (($employeeId == null) ? 43 : $employeeId.hashCode());
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
        return result;
    }

    @Override
    public String toString() {
        return "ExpenseRequest(accountType=" + getAccountType() + ", employeeId=" + getEmployeeId() + ", otherName=" + getOtherName() + ", amount=" + getAmount() + ", paymentMethod=" + getPaymentMethod() + ", expenseDate=" + getExpenseDate() + ")";
    }
}
