package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", uniqueConstraints = {@UniqueConstraint(columnNames = {"company_name", "role"})})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private Role role;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "gst_number", length = 50)
    private String gstNumber;

    @Column(name = "fssai_license", length = 50)
    private String fssaiLicense;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    // Printed on barcode stickers for repacked & marketed by section.
    @Column(name = "packing_licence_no", length = 50)
    private String packingLicenceNo;

    // Used as "Customer Care" on barcode stickers.
    @Column(name = "customer_care_number", length = 20)
    private String customerCareNumber;

    // Optional email to show contact details in admin settings.
    @Column(name = "customer_care_email", length = 120)
    private String customerCareEmail;

    @Column(name = "bank_name", length = 200)
    private String bankName;

    @Column(name = "account_number", length = 50)
    private String accountNumber;

    @Column(name = "ifsc_code", length = 20)
    private String ifscCode;

    @Column(name = "branch_name", length = 200)
    private String branchName;

    @Column(name = "b2b_invoice_start")
    private Integer b2bInvoiceStart;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Role {
        ADMIN, CASHIER;
    }

    public User() {}

    public User(Integer userId, String companyName, Role role, String password, String gstNumber, String fssaiLicense, String address, String phoneNumber, String bankName, String accountNumber, String ifscCode, String branchName, Integer b2bInvoiceStart, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.userId = userId;
        this.companyName = companyName;
        this.role = role;
        this.password = password;
        this.gstNumber = gstNumber;
        this.fssaiLicense = fssaiLicense;
        this.address = address;
        this.phoneNumber = phoneNumber;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.ifscCode = ifscCode;
        this.branchName = branchName;
        this.b2bInvoiceStart = b2bInvoiceStart;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setGstNumber(String gstNumber) {
        this.gstNumber = gstNumber;
    }

    public void setFssaiLicense(String fssaiLicense) {
        this.fssaiLicense = fssaiLicense;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPackingLicenceNo() {
        return this.packingLicenceNo;
    }

    public void setPackingLicenceNo(String packingLicenceNo) {
        this.packingLicenceNo = packingLicenceNo;
    }

    public String getCustomerCareNumber() {
        return this.customerCareNumber;
    }

    public void setCustomerCareNumber(String customerCareNumber) {
        this.customerCareNumber = customerCareNumber;
    }

    public String getCustomerCareEmail() {
        return this.customerCareEmail;
    }

    public void setCustomerCareEmail(String customerCareEmail) {
        this.customerCareEmail = customerCareEmail;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public void setIfscCode(String ifscCode) {
        this.ifscCode = ifscCode;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public void setB2bInvoiceStart(Integer b2bInvoiceStart) {
        this.b2bInvoiceStart = b2bInvoiceStart;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getUserId() {
        return this.userId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public Role getRole() {
        return this.role;
    }

    public String getPassword() {
        return this.password;
    }

    public String getGstNumber() {
        return this.gstNumber;
    }

    public String getFssaiLicense() {
        return this.fssaiLicense;
    }

    public String getAddress() {
        return this.address;
    }

    public String getPhoneNumber() {
        return this.phoneNumber;
    }

    public String getBankName() {
        return this.bankName;
    }

    public String getAccountNumber() {
        return this.accountNumber;
    }

    public String getIfscCode() {
        return this.ifscCode;
    }

    public String getBranchName() {
        return this.branchName;
    }

    public Integer getB2bInvoiceStart() {
        return this.b2bInvoiceStart;
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
        if (!(o instanceof User)) return false;
        User other = (User)o;
        if (!other.canEqual(this)) return false;
        Object this$userId = getUserId(), other$userId = other.getUserId();
        if ((this$userId == null) ? (other$userId != null) : !this$userId.equals(other$userId)) return false;
        Object this$b2bInvoiceStart = getB2bInvoiceStart(), other$b2bInvoiceStart = other.getB2bInvoiceStart();
        if ((this$b2bInvoiceStart == null) ? (other$b2bInvoiceStart != null) : !this$b2bInvoiceStart.equals(other$b2bInvoiceStart)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$role = getRole(), other$role = other.getRole();
        if ((this$role == null) ? (other$role != null) : !this$role.equals(other$role)) return false;
        Object this$password = getPassword(), other$password = other.getPassword();
        if ((this$password == null) ? (other$password != null) : !this$password.equals(other$password)) return false;
        Object this$gstNumber = getGstNumber(), other$gstNumber = other.getGstNumber();
        if ((this$gstNumber == null) ? (other$gstNumber != null) : !this$gstNumber.equals(other$gstNumber)) return false;
        Object this$fssaiLicense = getFssaiLicense(), other$fssaiLicense = other.getFssaiLicense();
        if ((this$fssaiLicense == null) ? (other$fssaiLicense != null) : !this$fssaiLicense.equals(other$fssaiLicense)) return false;
        Object this$address = getAddress(), other$address = other.getAddress();
        if ((this$address == null) ? (other$address != null) : !this$address.equals(other$address)) return false;
        Object this$phoneNumber = getPhoneNumber(), other$phoneNumber = other.getPhoneNumber();
        if ((this$phoneNumber == null) ? (other$phoneNumber != null) : !this$phoneNumber.equals(other$phoneNumber)) return false;
        Object this$bankName = getBankName(), other$bankName = other.getBankName();
        if ((this$bankName == null) ? (other$bankName != null) : !this$bankName.equals(other$bankName)) return false;
        Object this$accountNumber = getAccountNumber(), other$accountNumber = other.getAccountNumber();
        if ((this$accountNumber == null) ? (other$accountNumber != null) : !this$accountNumber.equals(other$accountNumber)) return false;
        Object this$ifscCode = getIfscCode(), other$ifscCode = other.getIfscCode();
        if ((this$ifscCode == null) ? (other$ifscCode != null) : !this$ifscCode.equals(other$ifscCode)) return false;
        Object this$branchName = getBranchName(), other$branchName = other.getBranchName();
        if ((this$branchName == null) ? (other$branchName != null) : !this$branchName.equals(other$branchName)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        return !((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof User;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $userId = getUserId();
        result = result * PRIME + (($userId == null) ? 43 : $userId.hashCode());
        Object $b2bInvoiceStart = getB2bInvoiceStart();
        result = result * PRIME + (($b2bInvoiceStart == null) ? 43 : $b2bInvoiceStart.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $role = getRole();
        result = result * PRIME + (($role == null) ? 43 : $role.hashCode());
        Object $password = getPassword();
        result = result * PRIME + (($password == null) ? 43 : $password.hashCode());
        Object $gstNumber = getGstNumber();
        result = result * PRIME + (($gstNumber == null) ? 43 : $gstNumber.hashCode());
        Object $fssaiLicense = getFssaiLicense();
        result = result * PRIME + (($fssaiLicense == null) ? 43 : $fssaiLicense.hashCode());
        Object $address = getAddress();
        result = result * PRIME + (($address == null) ? 43 : $address.hashCode());
        Object $phoneNumber = getPhoneNumber();
        result = result * PRIME + (($phoneNumber == null) ? 43 : $phoneNumber.hashCode());
        Object $bankName = getBankName();
        result = result * PRIME + (($bankName == null) ? 43 : $bankName.hashCode());
        Object $accountNumber = getAccountNumber();
        result = result * PRIME + (($accountNumber == null) ? 43 : $accountNumber.hashCode());
        Object $ifscCode = getIfscCode();
        result = result * PRIME + (($ifscCode == null) ? 43 : $ifscCode.hashCode());
        Object $branchName = getBranchName();
        result = result * PRIME + (($branchName == null) ? 43 : $branchName.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        return result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
    }

    @Override
    public String toString() {
        return "User(userId=" + getUserId() + ", companyName=" + getCompanyName() + ", role=" + getRole() + ", password=" + getPassword() + ", gstNumber=" + getGstNumber() + ", fssaiLicense=" + getFssaiLicense() + ", address=" + getAddress() + ", phoneNumber=" + getPhoneNumber() + ", bankName=" + getBankName() + ", accountNumber=" + getAccountNumber() + ", ifscCode=" + getIfscCode() + ", branchName=" + getBranchName() + ", b2bInvoiceStart=" + getB2bInvoiceStart() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ")";
    }
}
