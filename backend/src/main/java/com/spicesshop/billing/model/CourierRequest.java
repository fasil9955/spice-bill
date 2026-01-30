package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "courier_requests")
public class CourierRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "courier_id")
    private Integer courierId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "invoice_id")
    private Integer invoiceId;

    @Column(name = "invoice_number", length = 50)
    private String invoiceNumber;

    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "phone_1", length = 20)
    private String phone1;

    @Column(name = "phone_2", length = 20)
    private String phone2;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "tracking_id", length = 100)
    private String trackingId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CourierRequest() {
        this.status = "PENDING";
    }

    public CourierRequest(Integer courierId, String companyName, Integer invoiceId, String invoiceNumber, String customerName, String address, String phone1, String phone2, String status, String trackingId, LocalDateTime createdAt) {
        this.courierId = courierId;
        this.companyName = companyName;
        this.invoiceId = invoiceId;
        this.invoiceNumber = invoiceNumber;
        this.customerName = customerName;
        this.address = address;
        this.phone1 = phone1;
        this.phone2 = phone2;
        this.status = status != null ? status : "PENDING";
        this.trackingId = trackingId;
        this.createdAt = createdAt;
    }

    public void setCourierId(Integer courierId) {
        this.courierId = courierId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setInvoiceId(Integer invoiceId) {
        this.invoiceId = invoiceId;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setPhone1(String phone1) {
        this.phone1 = phone1;
    }

    public void setPhone2(String phone2) {
        this.phone2 = phone2;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public void setTrackingId(String trackingId) {
        this.trackingId = trackingId;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return this.updatedAt;
    }

    public Integer getCourierId() {
        return this.courierId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public Integer getInvoiceId() {
        return this.invoiceId;
    }

    public String getInvoiceNumber() {
        return this.invoiceNumber;
    }

    public String getCustomerName() {
        return this.customerName;
    }

    public String getAddress() {
        return this.address;
    }

    public String getPhone1() {
        return this.phone1;
    }

    public String getPhone2() {
        return this.phone2;
    }

    public String getStatus() {
        return this.status;
    }

    public String getTrackingId() {
        return this.trackingId;
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
        if (!(o instanceof CourierRequest)) return false;
        CourierRequest other = (CourierRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$courierId = getCourierId(), other$courierId = other.getCourierId();
        if ((this$courierId == null) ? (other$courierId != null) : !this$courierId.equals(other$courierId)) return false;
        Object this$invoiceId = getInvoiceId(), other$invoiceId = other.getInvoiceId();
        if ((this$invoiceId == null) ? (other$invoiceId != null) : !this$invoiceId.equals(other$invoiceId)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$invoiceNumber = getInvoiceNumber(), other$invoiceNumber = other.getInvoiceNumber();
        if ((this$invoiceNumber == null) ? (other$invoiceNumber != null) : !this$invoiceNumber.equals(other$invoiceNumber)) return false;
        Object this$customerName = getCustomerName(), other$customerName = other.getCustomerName();
        if ((this$customerName == null) ? (other$customerName != null) : !this$customerName.equals(other$customerName)) return false;
        Object this$address = getAddress(), other$address = other.getAddress();
        if ((this$address == null) ? (other$address != null) : !this$address.equals(other$address)) return false;
        Object this$phone1 = getPhone1(), other$phone1 = other.getPhone1();
        if ((this$phone1 == null) ? (other$phone1 != null) : !this$phone1.equals(other$phone1)) return false;
        Object this$phone2 = getPhone2(), other$phone2 = other.getPhone2();
        if ((this$phone2 == null) ? (other$phone2 != null) : !this$phone2.equals(other$phone2)) return false;
        Object this$status = getStatus(), other$status = other.getStatus();
        if ((this$status == null) ? (other$status != null) : !this$status.equals(other$status)) return false;
        Object this$trackingId = getTrackingId(), other$trackingId = other.getTrackingId();
        if ((this$trackingId == null) ? (other$trackingId != null) : !this$trackingId.equals(other$trackingId)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        return !((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CourierRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $courierId = getCourierId();
        result = result * PRIME + (($courierId == null) ? 43 : $courierId.hashCode());
        Object $invoiceId = getInvoiceId();
        result = result * PRIME + (($invoiceId == null) ? 43 : $invoiceId.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $invoiceNumber = getInvoiceNumber();
        result = result * PRIME + (($invoiceNumber == null) ? 43 : $invoiceNumber.hashCode());
        Object $customerName = getCustomerName();
        result = result * PRIME + (($customerName == null) ? 43 : $customerName.hashCode());
        Object $address = getAddress();
        result = result * PRIME + (($address == null) ? 43 : $address.hashCode());
        Object $phone1 = getPhone1();
        result = result * PRIME + (($phone1 == null) ? 43 : $phone1.hashCode());
        Object $phone2 = getPhone2();
        result = result * PRIME + (($phone2 == null) ? 43 : $phone2.hashCode());
        Object $status = getStatus();
        result = result * PRIME + (($status == null) ? 43 : $status.hashCode());
        Object $trackingId = getTrackingId();
        result = result * PRIME + (($trackingId == null) ? 43 : $trackingId.hashCode());
        Object $createdAt = getCreatedAt();
        return result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
    }

    @Override
    public String toString() {
        return "CourierRequest(courierId=" + getCourierId() + ", companyName=" + getCompanyName() + ", invoiceId=" + getInvoiceId() + ", invoiceNumber=" + getInvoiceNumber() + ", customerName=" + getCustomerName() + ", address=" + getAddress() + ", phone1=" + getPhone1() + ", phone2=" + getPhone2() + ", status=" + getStatus() + ", trackingId=" + getTrackingId() + ", createdAt=" + getCreatedAt() + ")";
    }
}
