package com.spicesshop.billing.dto;

import java.math.BigDecimal;

public class EmployeeLedgerEntryRequest {
    private Integer employeeId;
    private String entryType; // ADVANCE | REPAYMENT
    private BigDecimal amount;
    private String paymentMethod;
    private String entryDate;
    private String reference;

    public Integer getEmployeeId() { return employeeId; }
    public void setEmployeeId(Integer employeeId) { this.employeeId = employeeId; }
    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getEntryDate() { return entryDate; }
    public void setEntryDate(String entryDate) { this.entryDate = entryDate; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
}
