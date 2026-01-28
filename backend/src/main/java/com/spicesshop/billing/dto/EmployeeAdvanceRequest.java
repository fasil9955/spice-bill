package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class EmployeeAdvanceRequest {
    private Integer employeeId;
    private BigDecimal amount;
    private String paymentMethod;
    private String recordDate;

    public EmployeeAdvanceRequest() {}

    public EmployeeAdvanceRequest(Integer employeeId, BigDecimal amount, String paymentMethod, String recordDate) {
        this.employeeId = employeeId;
        this.amount = amount;
        this.paymentMethod = paymentMethod;
        this.recordDate = recordDate;
    }

    public Integer getEmployeeId() {
        return this.employeeId;
    }

    public void setEmployeeId(Integer employeeId) {
        this.employeeId = employeeId;
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

    public String getRecordDate() {
        return this.recordDate;
    }

    public void setRecordDate(String recordDate) {
        this.recordDate = recordDate;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof EmployeeAdvanceRequest)) return false;
        EmployeeAdvanceRequest other = (EmployeeAdvanceRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$employeeId = getEmployeeId(), other$employeeId = other.getEmployeeId();
        if ((this$employeeId == null) ? (other$employeeId != null) : !this$employeeId.equals(other$employeeId)) return false;
        Object this$amount = getAmount(), other$amount = other.getAmount();
        if ((this$amount == null) ? (other$amount != null) : !this$amount.equals(other$amount)) return false;
        Object this$paymentMethod = getPaymentMethod(), other$paymentMethod = other.getPaymentMethod();
        if ((this$paymentMethod == null) ? (other$paymentMethod != null) : !this$paymentMethod.equals(other$paymentMethod)) return false;
        Object this$recordDate = getRecordDate(), other$recordDate = other.getRecordDate();
        return !((this$recordDate == null) ? (other$recordDate != null) : !this$recordDate.equals(other$recordDate));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EmployeeAdvanceRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $employeeId = getEmployeeId();
        result = result * PRIME + (($employeeId == null) ? 43 : $employeeId.hashCode());
        Object $amount = getAmount();
        result = result * PRIME + (($amount == null) ? 43 : $amount.hashCode());
        Object $paymentMethod = getPaymentMethod();
        result = result * PRIME + (($paymentMethod == null) ? 43 : $paymentMethod.hashCode());
        Object $recordDate = getRecordDate();
        result = result * PRIME + (($recordDate == null) ? 43 : $recordDate.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "EmployeeAdvanceRequest(employeeId=" + getEmployeeId() + ", amount=" + getAmount() + ", paymentMethod=" + getPaymentMethod() + ", recordDate=" + getRecordDate() + ")";
    }
}
