package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "categories")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "category_id")
    private Integer categoryId;

    @Column(name = "category_name", nullable = false, unique = true)
    private String categoryName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Category() {}

    public Category(Integer categoryId, String categoryName, String description, LocalDateTime createdAt) {
        this.categoryId = categoryId;
        this.categoryName = categoryName;
        this.description = description;
        this.createdAt = createdAt;
    }

    public void setCategoryId(Integer categoryId) {
        this.categoryId = categoryId;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getCategoryId() {
        return this.categoryId;
    }

    public String getCategoryName() {
        return this.categoryName;
    }

    public String getDescription() {
        return this.description;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof Category)) return false;
        Category other = (Category) o;
        if (!other.canEqual(this)) return false;
        Object this$categoryId = getCategoryId(), other$categoryId = other.getCategoryId();
        if ((this$categoryId == null) ? (other$categoryId != null) : !this$categoryId.equals(other$categoryId)) return false;
        Object this$categoryName = getCategoryName(), other$categoryName = other.getCategoryName();
        if ((this$categoryName == null) ? (other$categoryName != null) : !this$categoryName.equals(other$categoryName)) return false;
        Object this$description = getDescription(), other$description = other.getDescription();
        if ((this$description == null) ? (other$description != null) : !this$description.equals(other$description)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        return !((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Category;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $categoryId = getCategoryId();
        result = result * PRIME + (($categoryId == null) ? 43 : $categoryId.hashCode());
        Object $categoryName = getCategoryName();
        result = result * PRIME + (($categoryName == null) ? 43 : $categoryName.hashCode());
        Object $description = getDescription();
        result = result * PRIME + (($description == null) ? 43 : $description.hashCode());
        Object $createdAt = getCreatedAt();
        return result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
    }

    @Override
    public String toString() {
        return "Category(categoryId=" + getCategoryId() + ", categoryName=" + getCategoryName() + ", description=" + getDescription() + ", createdAt=" + getCreatedAt() + ")";
    }
}
