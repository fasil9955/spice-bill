package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Ledger entry for employee account. ADVANCE = money given to employee (debit to employee).
 * REPAYMENT = money received from employee (credit). Running balance: positive = employee owes company.
 */
@Entity
@Table(name = "employee_ledger_entries")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class EmployeeLedgerEntry {

    public static final String TYPE_ADVANCE = "ADVANCE";
    public static final String TYPE_REPAYMENT = "REPAYMENT";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "entry_id")
    private Integer entryId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "employee_id", nullable = false)
    private Integer employeeId;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "entry_type", nullable = false, length = 20)
    private String entryType; // ADVANCE | REPAYMENT

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_method", length = 20)
    private String paymentMethod;

    @Column(name = "reference", length = 200)
    private String reference;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public EmployeeLedgerEntry() {}

    public Integer getEntryId() { return entryId; }
    public void setEntryId(Integer entryId) { this.entryId = entryId; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public Integer getEmployeeId() { return employeeId; }
    public void setEmployeeId(Integer employeeId) { this.employeeId = employeeId; }
    public LocalDate getEntryDate() { return entryDate; }
    public void setEntryDate(LocalDate entryDate) { this.entryDate = entryDate; }
    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    protected void onCreate() {
        if (this.entryDate == null) this.entryDate = LocalDate.now();
        this.createdAt = LocalDateTime.now();
    }
}
