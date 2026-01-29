package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class EmployeeSalaryClearanceRequest {
    private Integer employeeId;
    private String month;
    private BigDecimal salaryAmount;
    private BigDecimal totalTaken;

    public EmployeeSalaryClearanceRequest() {}

    public EmployeeSalaryClearanceRequest(Integer employeeId, String month, BigDecimal salaryAmount, BigDecimal totalTaken) {
        this.employeeId = employeeId;
        this.month = month;
        this.salaryAmount = salaryAmount;
        this.totalTaken = totalTaken;
    }

    public Integer getEmployeeId() {
        return this.employeeId;
    }

    public void setEmployeeId(Integer employeeId) {
        this.employeeId = employeeId;
    }

    public String getMonth() {
        return this.month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public BigDecimal getSalaryAmount() {
        return this.salaryAmount;
    }

    public void setSalaryAmount(BigDecimal salaryAmount) {
        this.salaryAmount = salaryAmount;
    }

    public BigDecimal getTotalTaken() {
        return this.totalTaken;
    }

    public void setTotalTaken(BigDecimal totalTaken) {
        this.totalTaken = totalTaken;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof EmployeeSalaryClearanceRequest)) return false;
        EmployeeSalaryClearanceRequest other = (EmployeeSalaryClearanceRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$employeeId = getEmployeeId(), other$employeeId = other.getEmployeeId();
        if ((this$employeeId == null) ? (other$employeeId != null) : !this$employeeId.equals(other$employeeId)) return false;
        Object this$month = getMonth(), other$month = other.getMonth();
        if ((this$month == null) ? (other$month != null) : !this$month.equals(other$month)) return false;
        Object this$salaryAmount = getSalaryAmount(), other$salaryAmount = other.getSalaryAmount();
        if ((this$salaryAmount == null) ? (other$salaryAmount != null) : !this$salaryAmount.equals(other$salaryAmount)) return false;
        Object this$totalTaken = getTotalTaken(), other$totalTaken = other.getTotalTaken();
        return !((this$totalTaken == null) ? (other$totalTaken != null) : !this$totalTaken.equals(other$totalTaken));
    }

    protected boolean canEqual(Object other) {
        return other instanceof EmployeeSalaryClearanceRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $employeeId = getEmployeeId();
        result = result * PRIME + (($employeeId == null) ? 43 : $employeeId.hashCode());
        Object $month = getMonth();
        result = result * PRIME + (($month == null) ? 43 : $month.hashCode());
        Object $salaryAmount = getSalaryAmount();
        result = result * PRIME + (($salaryAmount == null) ? 43 : $salaryAmount.hashCode());
        Object $totalTaken = getTotalTaken();
        result = result * PRIME + (($totalTaken == null) ? 43 : $totalTaken.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "EmployeeSalaryClearanceRequest(employeeId=" + getEmployeeId() + ", month=" + getMonth() + ", salaryAmount=" + getSalaryAmount() + ", totalTaken=" + getTotalTaken() + ")";
    }
}
