package com.spicesshop.billing.dto;

public class LoginResponse {
    private String token;
    private String role;
    private String companyName;
    private Integer userId;

    public LoginResponse() {}

    public LoginResponse(String token, String role, String companyName, Integer userId) {
        this.token = token;
        this.role = role;
        this.companyName = companyName;
        this.userId = userId;
    }

    public String getToken() {
        return this.token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public Integer getUserId() {
        return this.userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof LoginResponse)) return false;
        LoginResponse other = (LoginResponse) o;
        if (!other.canEqual(this)) return false;
        Object this$userId = getUserId(), other$userId = other.getUserId();
        if ((this$userId == null) ? (other$userId != null) : !this$userId.equals(other$userId)) return false;
        Object this$token = getToken(), other$token = other.getToken();
        if ((this$token == null) ? (other$token != null) : !this$token.equals(other$token)) return false;
        Object this$role = getRole(), other$role = other.getRole();
        if ((this$role == null) ? (other$role != null) : !this$role.equals(other$role)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        return !((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName));
    }

    protected boolean canEqual(Object other) {
        return other instanceof LoginResponse;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $userId = getUserId();
        result = result * PRIME + (($userId == null) ? 43 : $userId.hashCode());
        Object $token = getToken();
        result = result * PRIME + (($token == null) ? 43 : $token.hashCode());
        Object $role = getRole();
        result = result * PRIME + (($role == null) ? 43 : $role.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "LoginResponse(token=" + getToken() + ", role=" + getRole() + ", companyName=" + getCompanyName() + ", userId=" + getUserId() + ")";
    }
}
