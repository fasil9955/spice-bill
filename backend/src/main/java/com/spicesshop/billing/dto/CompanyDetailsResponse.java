package com.spicesshop.billing.dto;

public class CompanyDetailsResponse {
    private String companyName;
    private String gstNumber;
    private String fssaiLicense;
    private String address;
    private String phoneNumber;
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String branchName;
    private Integer b2bInvoiceStart;

    public CompanyDetailsResponse() {}

    public CompanyDetailsResponse(String companyName, String gstNumber, String fssaiLicense, String address, String phoneNumber, String bankName, String accountNumber, String ifscCode, String branchName, Integer b2bInvoiceStart) {
        this.companyName = companyName;
        this.gstNumber = gstNumber;
        this.fssaiLicense = fssaiLicense;
        this.address = address;
        this.phoneNumber = phoneNumber;
        this.bankName = bankName;
        this.accountNumber = accountNumber;
        this.ifscCode = ifscCode;
        this.branchName = branchName;
        this.b2bInvoiceStart = b2bInvoiceStart;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
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

    public String getBankName() {
        return this.bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getAccountNumber() {
        return this.accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getIfscCode() {
        return this.ifscCode;
    }

    public void setIfscCode(String ifscCode) {
        this.ifscCode = ifscCode;
    }

    public String getBranchName() {
        return this.branchName;
    }

    public void setBranchName(String branchName) {
        this.branchName = branchName;
    }

    public Integer getB2bInvoiceStart() {
        return this.b2bInvoiceStart;
    }

    public void setB2bInvoiceStart(Integer b2bInvoiceStart) {
        this.b2bInvoiceStart = b2bInvoiceStart;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof CompanyDetailsResponse)) return false;
        CompanyDetailsResponse other = (CompanyDetailsResponse) o;
        if (!other.canEqual(this)) return false;
        Object this$b2bInvoiceStart = getB2bInvoiceStart(), other$b2bInvoiceStart = other.getB2bInvoiceStart();
        if ((this$b2bInvoiceStart == null) ? (other$b2bInvoiceStart != null) : !this$b2bInvoiceStart.equals(other$b2bInvoiceStart)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
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
        return !((this$branchName == null) ? (other$branchName != null) : !this$branchName.equals(other$branchName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof CompanyDetailsResponse;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $b2bInvoiceStart = getB2bInvoiceStart();
        result = result * PRIME + (($b2bInvoiceStart == null) ? 43 : $b2bInvoiceStart.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
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
        return result;
    }

    @Override
    public String toString() {
        return "CompanyDetailsResponse(companyName=" + getCompanyName() + ", gstNumber=" + getGstNumber() + ", fssaiLicense=" + getFssaiLicense() + ", address=" + getAddress() + ", phoneNumber=" + getPhoneNumber() + ", bankName=" + getBankName() + ", accountNumber=" + getAccountNumber() + ", ifscCode=" + getIfscCode() + ", branchName=" + getBranchName() + ", b2bInvoiceStart=" + getB2bInvoiceStart() + ")";
    }
}
