package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "employees", uniqueConstraints = {@UniqueConstraint(columnNames = {"company_name", "employee_code"})})
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "employee_id")
    private Integer employeeId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "employee_code", nullable = false, length = 50)
    private String employeeCode;

    @Column(name = "employee_name", nullable = false, length = 200)
    private String employeeName;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "designation", length = 100)
    private String designation;

    @Column(name = "aadhar_document", length = 500)
    private String aadharDocument;

    @Column(name = "photo", length = 500)
    private String photo;

    @Column(name = "is_active")
    private Boolean isActive;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Employee() {
        this.isActive = true;
    }

    public Employee(Integer employeeId, String companyName, String employeeCode, String employeeName, String phone, String email, String department, String designation, String aadharDocument, String photo, Boolean isActive, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.employeeId = employeeId;
        this.companyName = companyName;
        this.employeeCode = employeeCode;
        this.employeeName = employeeName;
        this.phone = phone;
        this.email = email;
        this.department = department;
        this.designation = designation;
        this.aadharDocument = aadharDocument;
        this.photo = photo;
        this.isActive = isActive != null ? isActive : true;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void setEmployeeId(Integer employeeId) {
        this.employeeId = employeeId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public void setAadharDocument(String aadharDocument) {
        this.aadharDocument = aadharDocument;
    }

    public void setPhoto(String photo) {
        this.photo = photo;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getEmployeeId() {
        return this.employeeId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public String getEmployeeCode() {
        return this.employeeCode;
    }

    public String getEmployeeName() {
        return this.employeeName;
    }

    public String getPhone() {
        return this.phone;
    }

    public Boolean getIsActive() {
        return this.isActive;
    }

    public String getEmail() {
        return this.email;
    }

    public String getDepartment() {
        return this.department;
    }

    public String getDesignation() {
        return this.designation;
    }

    public String getAadharDocument() {
        return this.aadharDocument;
    }

    public String getPhoto() {
        return this.photo;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof Employee)) return false;
        Employee other = (Employee) o;
        if (!other.canEqual(this)) return false;
        Object this$employeeId = getEmployeeId(), other$employeeId = other.getEmployeeId();
        if ((this$employeeId == null) ? (other$employeeId != null) : !this$employeeId.equals(other$employeeId)) return false;
        Object this$isActive = getIsActive(), other$isActive = other.getIsActive();
        if ((this$isActive == null) ? (other$isActive != null) : !this$isActive.equals(other$isActive)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$employeeCode = getEmployeeCode(), other$employeeCode = other.getEmployeeCode();
        if ((this$employeeCode == null) ? (other$employeeCode != null) : !this$employeeCode.equals(other$employeeCode)) return false;
        Object this$employeeName = getEmployeeName(), other$employeeName = other.getEmployeeName();
        if ((this$employeeName == null) ? (other$employeeName != null) : !this$employeeName.equals(other$employeeName)) return false;
        Object this$phone = getPhone(), other$phone = other.getPhone();
        if ((this$phone == null) ? (other$phone != null) : !this$phone.equals(other$phone)) return false;
        Object this$email = getEmail(), other$email = other.getEmail();
        if ((this$email == null) ? (other$email != null) : !this$email.equals(other$email)) return false;
        Object this$department = getDepartment(), other$department = other.getDepartment();
        if ((this$department == null) ? (other$department != null) : !this$department.equals(other$department)) return false;
        Object this$designation = getDesignation(), other$designation = other.getDesignation();
        if ((this$designation == null) ? (other$designation != null) : !this$designation.equals(other$designation)) return false;
        Object this$aadharDocument = getAadharDocument(), other$aadharDocument = other.getAadharDocument();
        if ((this$aadharDocument == null) ? (other$aadharDocument != null) : !this$aadharDocument.equals(other$aadharDocument)) return false;
        Object this$photo = getPhoto(), other$photo = other.getPhoto();
        if ((this$photo == null) ? (other$photo != null) : !this$photo.equals(other$photo)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        return !((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Employee;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $employeeId = getEmployeeId();
        result = result * PRIME + (($employeeId == null) ? 43 : $employeeId.hashCode());
        Object $isActive = getIsActive();
        result = result * PRIME + (($isActive == null) ? 43 : $isActive.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $employeeCode = getEmployeeCode();
        result = result * PRIME + (($employeeCode == null) ? 43 : $employeeCode.hashCode());
        Object $employeeName = getEmployeeName();
        result = result * PRIME + (($employeeName == null) ? 43 : $employeeName.hashCode());
        Object $phone = getPhone();
        result = result * PRIME + (($phone == null) ? 43 : $phone.hashCode());
        Object $email = getEmail();
        result = result * PRIME + (($email == null) ? 43 : $email.hashCode());
        Object $department = getDepartment();
        result = result * PRIME + (($department == null) ? 43 : $department.hashCode());
        Object $designation = getDesignation();
        result = result * PRIME + (($designation == null) ? 43 : $designation.hashCode());
        Object $aadharDocument = getAadharDocument();
        result = result * PRIME + (($aadharDocument == null) ? 43 : $aadharDocument.hashCode());
        Object $photo = getPhoto();
        result = result * PRIME + (($photo == null) ? 43 : $photo.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        return result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
    }

    @Override
    public String toString() {
        return "Employee(employeeId=" + getEmployeeId() + ", companyName=" + getCompanyName() + ", employeeCode=" + getEmployeeCode() + ", employeeName=" + getEmployeeName() + ", phone=" + getPhone() + ", email=" + getEmail() + ", department=" + getDepartment() + ", designation=" + getDesignation() + ", aadharDocument=" + getAadharDocument() + ", photo=" + getPhoto() + ", isActive=" + getIsActive() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ")";
    }
}
