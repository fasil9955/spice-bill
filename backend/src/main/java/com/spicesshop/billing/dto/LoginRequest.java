package com.spicesshop.billing.dto;

public class LoginRequest {
    private String companyName;
    private String role;
    private String password;

    public LoginRequest() {}

    public LoginRequest(String companyName, String role, String password) {
        this.companyName = companyName;
        this.role = role;
        this.password = password;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getPassword() {
        return this.password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof LoginRequest)) return false;
        LoginRequest other = (LoginRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$role = getRole(), other$role = other.getRole();
        if ((this$role == null) ? (other$role != null) : !this$role.equals(other$role)) return false;
        Object this$password = getPassword(), other$password = other.getPassword();
        return !((this$password == null) ? (other$password != null) : !this$password.equals(other$password));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LoginRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $role = getRole();
        result = result * PRIME + (($role == null) ? 43 : $role.hashCode());
        Object $password = getPassword();
        result = result * PRIME + (($password == null) ? 43 : $password.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "LoginRequest(companyName=" + getCompanyName() + ", role=" + getRole() + ", password=" + getPassword() + ")";
    }
}
