package com.spicesshop.billing.dto;

public class CourierRequestCreate {
    private String customerName;
    private String address;
    private String phone1;
    private String phone2;
    private Integer invoiceId;
    private String invoiceNumber;
    private String status;
    private String trackingId;

    public CourierRequestCreate() {}

    public CourierRequestCreate(String customerName, String address, String phone1, String phone2, Integer invoiceId, String invoiceNumber, String status, String trackingId) {
        this.customerName = customerName;
        this.address = address;
        this.phone1 = phone1;
        this.phone2 = phone2;
        this.invoiceId = invoiceId;
        this.invoiceNumber = invoiceNumber;
        this.status = status;
        this.trackingId = trackingId;
    }

    public String getCustomerName() {
        return this.customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getAddress() {
        return this.address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhone1() {
        return this.phone1;
    }

    public void setPhone1(String phone1) {
        this.phone1 = phone1;
    }

    public String getPhone2() {
        return this.phone2;
    }

    public void setPhone2(String phone2) {
        this.phone2 = phone2;
    }

    public Integer getInvoiceId() {
        return this.invoiceId;
    }

    public void setInvoiceId(Integer invoiceId) {
        this.invoiceId = invoiceId;
    }

    public String getInvoiceNumber() {
        return this.invoiceNumber;
    }

    public void setInvoiceNumber(String invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
    }

    public String getStatus() {
        return this.status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getTrackingId() {
        return this.trackingId;
    }

    public void setTrackingId(String trackingId) {
        this.trackingId = trackingId;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof CourierRequestCreate)) return false;
        CourierRequestCreate other = (CourierRequestCreate) o;
        if (!other.canEqual(this)) return false;
        Object this$invoiceId = getInvoiceId(), other$invoiceId = other.getInvoiceId();
        if ((this$invoiceId == null) ? (other$invoiceId != null) : !this$invoiceId.equals(other$invoiceId)) return false;
        Object this$customerName = getCustomerName(), other$customerName = other.getCustomerName();
        if ((this$customerName == null) ? (other$customerName != null) : !this$customerName.equals(other$customerName)) return false;
        Object this$address = getAddress(), other$address = other.getAddress();
        if ((this$address == null) ? (other$address != null) : !this$address.equals(other$address)) return false;
        Object this$phone1 = getPhone1(), other$phone1 = other.getPhone1();
        if ((this$phone1 == null) ? (other$phone1 != null) : !this$phone1.equals(other$phone1)) return false;
        Object this$phone2 = getPhone2(), other$phone2 = other.getPhone2();
        if ((this$phone2 == null) ? (other$phone2 != null) : !this$phone2.equals(other$phone2)) return false;
        Object this$invoiceNumber = getInvoiceNumber(), other$invoiceNumber = other.getInvoiceNumber();
        if ((this$invoiceNumber == null) ? (other$invoiceNumber != null) : !this$invoiceNumber.equals(other$invoiceNumber)) return false;
        Object this$status = getStatus(), other$status = other.getStatus();
        if ((this$status == null) ? (other$status != null) : !this$status.equals(other$status)) return false;
        Object this$trackingId = getTrackingId(), other$trackingId = other.getTrackingId();
        return !((this$trackingId == null) ? (other$trackingId != null) : !this$trackingId.equals(other$trackingId));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CourierRequestCreate;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $invoiceId = getInvoiceId();
        result = result * PRIME + (($invoiceId == null) ? 43 : $invoiceId.hashCode());
        Object $customerName = getCustomerName();
        result = result * PRIME + (($customerName == null) ? 43 : $customerName.hashCode());
        Object $address = getAddress();
        result = result * PRIME + (($address == null) ? 43 : $address.hashCode());
        Object $phone1 = getPhone1();
        result = result * PRIME + (($phone1 == null) ? 43 : $phone1.hashCode());
        Object $phone2 = getPhone2();
        result = result * PRIME + (($phone2 == null) ? 43 : $phone2.hashCode());
        Object $invoiceNumber = getInvoiceNumber();
        result = result * PRIME + (($invoiceNumber == null) ? 43 : $invoiceNumber.hashCode());
        Object $status = getStatus();
        result = result * PRIME + (($status == null) ? 43 : $status.hashCode());
        Object $trackingId = getTrackingId();
        result = result * PRIME + (($trackingId == null) ? 43 : $trackingId.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "CourierRequestCreate(customerName=" + getCustomerName() + ", address=" + getAddress() + ", phone1=" + getPhone1() + ", phone2=" + getPhone2() + ", invoiceId=" + getInvoiceId() + ", invoiceNumber=" + getInvoiceNumber() + ", status=" + getStatus() + ", trackingId=" + getTrackingId() + ")";
    }
}
