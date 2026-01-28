package com.spicesshop.billing.dto;

public class SignupResponse {
    private String message;
    private Integer adminUserId;
    private Integer cashierUserId;
    private String companyName;

    public SignupResponse() {}

    public SignupResponse(String message, Integer adminUserId, Integer cashierUserId, String companyName) {
        this.message = message;
        this.adminUserId = adminUserId;
        this.cashierUserId = cashierUserId;
        this.companyName = companyName;
    }

    public String getMessage() {
        return this.message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Integer getAdminUserId() {
        return this.adminUserId;
    }

    public void setAdminUserId(Integer adminUserId) {
        this.adminUserId = adminUserId;
    }

    public Integer getCashierUserId() {
        return this.cashierUserId;
    }

    public void setCashierUserId(Integer cashierUserId) {
        this.cashierUserId = cashierUserId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof SignupResponse)) return false;
        SignupResponse other = (SignupResponse) o;
        if (!other.canEqual(this)) return false;
        Object this$adminUserId = getAdminUserId(), other$adminUserId = other.getAdminUserId();
        if ((this$adminUserId == null) ? (other$adminUserId != null) : !this$adminUserId.equals(other$adminUserId)) return false;
        Object this$cashierUserId = getCashierUserId(), other$cashierUserId = other.getCashierUserId();
        if ((this$cashierUserId == null) ? (other$cashierUserId != null) : !this$cashierUserId.equals(other$cashierUserId)) return false;
        Object this$message = getMessage(), other$message = other.getMessage();
        if ((this$message == null) ? (other$message != null) : !this$message.equals(other$message)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        return !((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof SignupResponse;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $adminUserId = getAdminUserId();
        result = result * PRIME + (($adminUserId == null) ? 43 : $adminUserId.hashCode());
        Object $cashierUserId = getCashierUserId();
        result = result * PRIME + (($cashierUserId == null) ? 43 : $cashierUserId.hashCode());
        Object $message = getMessage();
        result = result * PRIME + (($message == null) ? 43 : $message.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "SignupResponse(message=" + getMessage() + ", adminUserId=" + getAdminUserId() + ", cashierUserId=" + getCashierUserId() + ", companyName=" + getCompanyName() + ")";
    }
}
