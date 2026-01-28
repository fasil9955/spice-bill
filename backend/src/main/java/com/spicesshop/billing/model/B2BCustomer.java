package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "b2b_customers")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class B2BCustomer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "customer_id")
    private Integer customerId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "customer_name", nullable = false, length = 200)
    private String customerName;

    @Column(name = "gst_number", length = 50, unique = true)
    private String gstNumber;

    @Column(name = "billing_address", length = 500)
    private String billingAddress;

    @Column(name = "shipping_address", length = 500)
    private String shippingAddress;

    @Column(name = "address", length = 500)
    private String address;

    @Column(name = "phone", length = 20)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "state_code", length = 10)
    private String stateCode;

    @Column(name = "company_name_in_invoice", length = 200)
    private String companyNameInInvoice;

    @OneToMany(mappedBy = "b2bCustomer", fetch = FetchType.LAZY)
    @JsonIgnoreProperties({"b2bCustomer", "items"})
    private List<Invoice> invoices;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public B2BCustomer() {}

    public B2BCustomer(Integer customerId, String companyName, String customerName, String gstNumber, String billingAddress, String shippingAddress, String address, String phone, String email, String stateCode, String companyNameInInvoice, List<Invoice> invoices, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.customerId = customerId;
        this.companyName = companyName;
        this.customerName = customerName;
        this.gstNumber = gstNumber;
        this.billingAddress = billingAddress;
        this.shippingAddress = shippingAddress;
        this.address = address;
        this.phone = phone;
        this.email = email;
        this.stateCode = stateCode;
        this.companyNameInInvoice = companyNameInInvoice;
        this.invoices = invoices;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public void setCustomerId(Integer customerId) {
        this.customerId = customerId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public void setGstNumber(String gstNumber) {
        this.gstNumber = gstNumber;
    }

    public void setBillingAddress(String billingAddress) {
        this.billingAddress = billingAddress;
    }

    public void setShippingAddress(String shippingAddress) {
        this.shippingAddress = shippingAddress;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setStateCode(String stateCode) {
        this.stateCode = stateCode;
    }

    public void setCompanyNameInInvoice(String companyNameInInvoice) {
        this.companyNameInInvoice = companyNameInInvoice;
    }

    @JsonIgnoreProperties({"b2bCustomer", "items"})
    public void setInvoices(List<Invoice> invoices) {
        this.invoices = invoices;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getCustomerId() {
        return this.customerId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public String getCustomerName() {
        return this.customerName;
    }

    public String getGstNumber() {
        return this.gstNumber;
    }

    public String getBillingAddress() {
        return this.billingAddress;
    }

    public String getShippingAddress() {
        return this.shippingAddress;
    }

    public String getAddress() {
        return this.address;
    }

    public String getPhone() {
        return this.phone;
    }

    public String getEmail() {
        return this.email;
    }

    public String getStateCode() {
        return this.stateCode;
    }

    public String getCompanyNameInInvoice() {
        return this.companyNameInInvoice;
    }

    public List<Invoice> getInvoices() {
        return this.invoices;
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
        if (this.gstNumber != null && this.gstNumber.length() >= 2) {
            this.stateCode = this.gstNumber.substring(0, 2);
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        if (this.gstNumber != null && this.gstNumber.length() >= 2) {
            this.stateCode = this.gstNumber.substring(0, 2);
        }
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof B2BCustomer)) return false;
        B2BCustomer other = (B2BCustomer) o;
        if (!other.canEqual(this)) return false;
        Object this$customerId = getCustomerId(), other$customerId = other.getCustomerId();
        if ((this$customerId == null) ? (other$customerId != null) : !this$customerId.equals(other$customerId)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$customerName = getCustomerName(), other$customerName = other.getCustomerName();
        if ((this$customerName == null) ? (other$customerName != null) : !this$customerName.equals(other$customerName)) return false;
        Object this$gstNumber = getGstNumber(), other$gstNumber = other.getGstNumber();
        if ((this$gstNumber == null) ? (other$gstNumber != null) : !this$gstNumber.equals(other$gstNumber)) return false;
        Object this$billingAddress = getBillingAddress(), other$billingAddress = other.getBillingAddress();
        if ((this$billingAddress == null) ? (other$billingAddress != null) : !this$billingAddress.equals(other$billingAddress)) return false;
        Object this$shippingAddress = getShippingAddress(), other$shippingAddress = other.getShippingAddress();
        if ((this$shippingAddress == null) ? (other$shippingAddress != null) : !this$shippingAddress.equals(other$shippingAddress)) return false;
        Object this$address = getAddress(), other$address = other.getAddress();
        if ((this$address == null) ? (other$address != null) : !this$address.equals(other$address)) return false;
        Object this$phone = getPhone(), other$phone = other.getPhone();
        if ((this$phone == null) ? (other$phone != null) : !this$phone.equals(other$phone)) return false;
        Object this$email = getEmail(), other$email = other.getEmail();
        if ((this$email == null) ? (other$email != null) : !this$email.equals(other$email)) return false;
        Object this$stateCode = getStateCode(), other$stateCode = other.getStateCode();
        if ((this$stateCode == null) ? (other$stateCode != null) : !this$stateCode.equals(other$stateCode)) return false;
        Object this$companyNameInInvoice = getCompanyNameInInvoice(), other$companyNameInInvoice = other.getCompanyNameInInvoice();
        if ((this$companyNameInInvoice == null) ? (other$companyNameInInvoice != null) : !this$companyNameInInvoice.equals(other$companyNameInInvoice)) return false;
        Object this$invoices = getInvoices(), other$invoices = other.getInvoices();
        if ((this$invoices == null) ? (other$invoices != null) : !this$invoices.equals(other$invoices)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        if ((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt)) return false;
        Object this$updatedAt = getUpdatedAt(), other$updatedAt = other.getUpdatedAt();
        return !((this$updatedAt == null) ? (other$updatedAt != null) : !this$updatedAt.equals(other$updatedAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof B2BCustomer;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $customerId = getCustomerId();
        result = result * PRIME + (($customerId == null) ? 43 : $customerId.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $customerName = getCustomerName();
        result = result * PRIME + (($customerName == null) ? 43 : $customerName.hashCode());
        Object $gstNumber = getGstNumber();
        result = result * PRIME + (($gstNumber == null) ? 43 : $gstNumber.hashCode());
        Object $billingAddress = getBillingAddress();
        result = result * PRIME + (($billingAddress == null) ? 43 : $billingAddress.hashCode());
        Object $shippingAddress = getShippingAddress();
        result = result * PRIME + (($shippingAddress == null) ? 43 : $shippingAddress.hashCode());
        Object $address = getAddress();
        result = result * PRIME + (($address == null) ? 43 : $address.hashCode());
        Object $phone = getPhone();
        result = result * PRIME + (($phone == null) ? 43 : $phone.hashCode());
        Object $email = getEmail();
        result = result * PRIME + (($email == null) ? 43 : $email.hashCode());
        Object $stateCode = getStateCode();
        result = result * PRIME + (($stateCode == null) ? 43 : $stateCode.hashCode());
        Object $companyNameInInvoice = getCompanyNameInInvoice();
        result = result * PRIME + (($companyNameInInvoice == null) ? 43 : $companyNameInInvoice.hashCode());
        Object $invoices = getInvoices();
        result = result * PRIME + (($invoices == null) ? 43 : $invoices.hashCode());
        Object $createdAt = getCreatedAt();
        result = result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
        Object $updatedAt = getUpdatedAt();
        return result * PRIME + (($updatedAt == null) ? 43 : $updatedAt.hashCode());
    }

    @Override
    public String toString() {
        return "B2BCustomer(customerId=" + getCustomerId() + ", companyName=" + getCompanyName() + ", customerName=" + getCustomerName() + ", gstNumber=" + getGstNumber() + ", billingAddress=" + getBillingAddress() + ", shippingAddress=" + getShippingAddress() + ", address=" + getAddress() + ", phone=" + getPhone() + ", email=" + getEmail() + ", stateCode=" + getStateCode() + ", companyNameInInvoice=" + getCompanyNameInInvoice() + ", invoices=" + getInvoices() + ", createdAt=" + getCreatedAt() + ", updatedAt=" + getUpdatedAt() + ")";
    }
}
