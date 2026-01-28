package com.spicesshop.billing.dto;

public class SignupRequest {
    private String companyName;
    private String adminPassword;
    private String cashierPassword;
    private String gstNumber;
    private String fssaiLicense;
    private String address;
    private String phoneNumber;

    public SignupRequest() {}

    public SignupRequest(String companyName, String adminPassword, String cashierPassword, String gstNumber, String fssaiLicense, String address, String phoneNumber) {
        this.companyName = companyName;
        this.adminPassword = adminPassword;
        this.cashierPassword = cashierPassword;
        this.gstNumber = gstNumber;
        this.fssaiLicense = fssaiLicense;
        this.address = address;
        this.phoneNumber = phoneNumber;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getAdminPassword() {
        return this.adminPassword;
    }

    public void setAdminPassword(String adminPassword) {
        this.adminPassword = adminPassword;
    }

    public String getCashierPassword() {
        return this.cashierPassword;
    }

    public void setCashierPassword(String cashierPassword) {
        this.cashierPassword = cashierPassword;
    }

    public String getGstNumber() {
        return this.gstNumber;
    }

    public void setGstNumber(String gstNumber) {
        this.gstNumber = gstNumber;
    }

    public String getFssaiLicense() {
        return this.fssaiLicense;
    }

    public void setFssaiLicense(String fssaiLicense) {
        this.fssaiLicense = fssaiLicense;
    }

    public String getAddress() {
        return this.address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPhoneNumber() {
        return this.phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof SignupRequest)) return false;
        SignupRequest other = (SignupRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$adminPassword = getAdminPassword(), other$adminPassword = other.getAdminPassword();
        if ((this$adminPassword == null) ? (other$adminPassword != null) : !this$adminPassword.equals(other$adminPassword)) return false;
        Object this$cashierPassword = getCashierPassword(), other$cashierPassword = other.getCashierPassword();
        if ((this$cashierPassword == null) ? (other$cashierPassword != null) : !this$cashierPassword.equals(other$cashierPassword)) return false;
        Object this$gstNumber = getGstNumber(), other$gstNumber = other.getGstNumber();
        if ((this$gstNumber == null) ? (other$gstNumber != null) : !this$gstNumber.equals(other$gstNumber)) return false;
        Object this$fssaiLicense = getFssaiLicense(), other$fssaiLicense = other.getFssaiLicense();
        if ((this$fssaiLicense == null) ? (other$fssaiLicense != null) : !this$fssaiLicense.equals(other$fssaiLicense)) return false;
        Object this$address = getAddress(), other$address = other.getAddress();
        if ((this$address == null) ? (other$address != null) : !this$address.equals(other$address)) return false;
        Object this$phoneNumber = getPhoneNumber(), other$phoneNumber = other.getPhoneNumber();
        return !((this$phoneNumber == null) ? (other$phoneNumber != null) : !this$phoneNumber.equals(other$phoneNumber));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SignupRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $adminPassword = getAdminPassword();
        result = result * PRIME + (($adminPassword == null) ? 43 : $adminPassword.hashCode());
        Object $cashierPassword = getCashierPassword();
        result = result * PRIME + (($cashierPassword == null) ? 43 : $cashierPassword.hashCode());
        Object $gstNumber = getGstNumber();
        result = result * PRIME + (($gstNumber == null) ? 43 : $gstNumber.hashCode());
        Object $fssaiLicense = getFssaiLicense();
        result = result * PRIME + (($fssaiLicense == null) ? 43 : $fssaiLicense.hashCode());
        Object $address = getAddress();
        result = result * PRIME + (($address == null) ? 43 : $address.hashCode());
        Object $phoneNumber = getPhoneNumber();
        result = result * PRIME + (($phoneNumber == null) ? 43 : $phoneNumber.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "SignupRequest(companyName=" + getCompanyName() + ", adminPassword=" + getAdminPassword() + ", cashierPassword=" + getCashierPassword() + ", gstNumber=" + getGstNumber() + ", fssaiLicense=" + getFssaiLicense() + ", address=" + getAddress() + ", phoneNumber=" + getPhoneNumber() + ")";
    }
}
