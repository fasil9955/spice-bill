package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "expense_categories", uniqueConstraints = {
    @UniqueConstraint(columnNames = { "company_name", "name" })
})
public class ExpenseCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public ExpenseCategory() {}

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) this.createdAt = LocalDateTime.now();
    }
}
