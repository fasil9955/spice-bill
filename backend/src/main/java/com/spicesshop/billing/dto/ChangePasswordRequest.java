package com.spicesshop.billing.dto;

public class ChangePasswordRequest {
    private String currentPassword;
    private String newPassword;
    private String confirmPassword;
    private String role;

    public ChangePasswordRequest() {}

    public ChangePasswordRequest(String currentPassword, String newPassword, String confirmPassword, String role) {
        this.currentPassword = currentPassword;
        this.newPassword = newPassword;
        this.confirmPassword = confirmPassword;
        this.role = role;
    }

    public String getCurrentPassword() {
        return this.currentPassword;
    }

    public void setCurrentPassword(String currentPassword) {
        this.currentPassword = currentPassword;
    }

    public String getNewPassword() {
        return this.newPassword;
    }

    public void setNewPassword(String newPassword) {
        this.newPassword = newPassword;
    }

    public String getConfirmPassword() {
        return this.confirmPassword;
    }

    public void setConfirmPassword(String confirmPassword) {
        this.confirmPassword = confirmPassword;
    }

    public String getRole() {
        return this.role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof ChangePasswordRequest)) return false;
        ChangePasswordRequest other = (ChangePasswordRequest) o;
        if (!other.canEqual(this)) return false;
        Object this$currentPassword = getCurrentPassword(), other$currentPassword = other.getCurrentPassword();
        if ((this$currentPassword == null) ? (other$currentPassword != null) : !this$currentPassword.equals(other$currentPassword)) return false;
        Object this$newPassword = getNewPassword(), other$newPassword = other.getNewPassword();
        if ((this$newPassword == null) ? (other$newPassword != null) : !this$newPassword.equals(other$newPassword)) return false;
        Object this$confirmPassword = getConfirmPassword(), other$confirmPassword = other.getConfirmPassword();
        if ((this$confirmPassword == null) ? (other$confirmPassword != null) : !this$confirmPassword.equals(other$confirmPassword)) return false;
        Object this$role = getRole(), other$role = other.getRole();
        return !((this$role == null) ? (other$role != null) : !this$role.equals(other$role));
    }

    protected boolean canEqual(Object other) {
        return other instanceof ChangePasswordRequest;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $currentPassword = getCurrentPassword();
        result = result * PRIME + (($currentPassword == null) ? 43 : $currentPassword.hashCode());
        Object $newPassword = getNewPassword();
        result = result * PRIME + (($newPassword == null) ? 43 : $newPassword.hashCode());
        Object $confirmPassword = getConfirmPassword();
        result = result * PRIME + (($confirmPassword == null) ? 43 : $confirmPassword.hashCode());
        Object $role = getRole();
        result = result * PRIME + (($role == null) ? 43 : $role.hashCode());
        return result;
    }

    @Override
    public String toString() {
        return "ChangePasswordRequest(currentPassword=" + getCurrentPassword() + ", newPassword=" + getNewPassword() + ", confirmPassword=" + getConfirmPassword() + ", role=" + getRole() + ")";
    }
}
