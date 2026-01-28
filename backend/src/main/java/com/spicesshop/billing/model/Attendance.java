package com.spicesshop.billing.model;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "attendance")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Integer attendanceId;

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private Employee employee;

    @Column(name = "employee_code", nullable = false, length = 50)
    private String employeeCode;

    @Column(name = "employee_name", nullable = false, length = 200)
    private String employeeName;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Column(name = "attendance_time", nullable = false)
    private LocalTime attendanceTime;

    @Column(name = "verification_mode", length = 50)
    private String verificationMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum AttendanceStatus {
        PRESENT, ABSENT, HALF_DAY;
    }

    public Attendance() {
        this.verificationMode = "Manual";
        this.status = AttendanceStatus.PRESENT;
    }

    public Attendance(Integer attendanceId, String companyName, Employee employee, String employeeCode, String employeeName, LocalDate attendanceDate, LocalTime attendanceTime, String verificationMode, AttendanceStatus status, String remarks, LocalDateTime createdAt) {
        this.attendanceId = attendanceId;
        this.companyName = companyName;
        this.employee = employee;
        this.employeeCode = employeeCode;
        this.employeeName = employeeName;
        this.attendanceDate = attendanceDate;
        this.attendanceTime = attendanceTime;
        this.verificationMode = verificationMode != null ? verificationMode : "Manual";
        this.status = status != null ? status : AttendanceStatus.PRESENT;
        this.remarks = remarks;
        this.createdAt = createdAt;
    }

    public void setAttendanceId(Integer attendanceId) {
        this.attendanceId = attendanceId;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public void setEmployee(Employee employee) {
        this.employee = employee;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
    }

    public void setEmployeeName(String employeeName) {
        this.employeeName = employeeName;
    }

    public void setAttendanceDate(LocalDate attendanceDate) {
        this.attendanceDate = attendanceDate;
    }

    public void setAttendanceTime(LocalTime attendanceTime) {
        this.attendanceTime = attendanceTime;
    }

    public void setVerificationMode(String verificationMode) {
        this.verificationMode = verificationMode;
    }

    public void setStatus(AttendanceStatus status) {
        this.status = status;
    }

    public void setRemarks(String remarks) {
        this.remarks = remarks;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getAttendanceId() {
        return this.attendanceId;
    }

    public String getCompanyName() {
        return this.companyName;
    }

    public Employee getEmployee() {
        return this.employee;
    }

    public String getEmployeeCode() {
        return this.employeeCode;
    }

    public String getEmployeeName() {
        return this.employeeName;
    }

    public LocalDate getAttendanceDate() {
        return this.attendanceDate;
    }

    public LocalTime getAttendanceTime() {
        return this.attendanceTime;
    }

    public String getVerificationMode() {
        return this.verificationMode;
    }

    public AttendanceStatus getStatus() {
        return this.status;
    }

    public String getRemarks() {
        return this.remarks;
    }

    public LocalDateTime getCreatedAt() {
        return this.createdAt;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.verificationMode == null || this.verificationMode.isEmpty()) {
            this.verificationMode = "Manual";
        }
    }

    @Override
    public boolean equals(Object o) {
        if (o == this) return true;
        if (!(o instanceof Attendance)) return false;
        Attendance other = (Attendance) o;
        if (!other.canEqual(this)) return false;
        Object this$attendanceId = getAttendanceId(), other$attendanceId = other.getAttendanceId();
        if ((this$attendanceId == null) ? (other$attendanceId != null) : !this$attendanceId.equals(other$attendanceId)) return false;
        Object this$companyName = getCompanyName(), other$companyName = other.getCompanyName();
        if ((this$companyName == null) ? (other$companyName != null) : !this$companyName.equals(other$companyName)) return false;
        Object this$employee = getEmployee(), other$employee = other.getEmployee();
        if ((this$employee == null) ? (other$employee != null) : !this$employee.equals(other$employee)) return false;
        Object this$employeeCode = getEmployeeCode(), other$employeeCode = other.getEmployeeCode();
        if ((this$employeeCode == null) ? (other$employeeCode != null) : !this$employeeCode.equals(other$employeeCode)) return false;
        Object this$employeeName = getEmployeeName(), other$employeeName = other.getEmployeeName();
        if ((this$employeeName == null) ? (other$employeeName != null) : !this$employeeName.equals(other$employeeName)) return false;
        Object this$attendanceDate = getAttendanceDate(), other$attendanceDate = other.getAttendanceDate();
        if ((this$attendanceDate == null) ? (other$attendanceDate != null) : !this$attendanceDate.equals(other$attendanceDate)) return false;
        Object this$attendanceTime = getAttendanceTime(), other$attendanceTime = other.getAttendanceTime();
        if ((this$attendanceTime == null) ? (other$attendanceTime != null) : !this$attendanceTime.equals(other$attendanceTime)) return false;
        Object this$verificationMode = getVerificationMode(), other$verificationMode = other.getVerificationMode();
        if ((this$verificationMode == null) ? (other$verificationMode != null) : !this$verificationMode.equals(other$verificationMode)) return false;
        Object this$status = getStatus(), other$status = other.getStatus();
        if ((this$status == null) ? (other$status != null) : !this$status.equals(other$status)) return false;
        Object this$remarks = getRemarks(), other$remarks = other.getRemarks();
        if ((this$remarks == null) ? (other$remarks != null) : !this$remarks.equals(other$remarks)) return false;
        Object this$createdAt = getCreatedAt(), other$createdAt = other.getCreatedAt();
        return !((this$createdAt == null) ? (other$createdAt != null) : !this$createdAt.equals(other$createdAt));
    }

    protected boolean canEqual(Object other) {
        return other instanceof Attendance;
    }

    @Override
    public int hashCode() {
        int PRIME = 59;
        int result = 1;
        Object $attendanceId = getAttendanceId();
        result = result * PRIME + (($attendanceId == null) ? 43 : $attendanceId.hashCode());
        Object $companyName = getCompanyName();
        result = result * PRIME + (($companyName == null) ? 43 : $companyName.hashCode());
        Object $employee = getEmployee();
        result = result * PRIME + (($employee == null) ? 43 : $employee.hashCode());
        Object $employeeCode = getEmployeeCode();
        result = result * PRIME + (($employeeCode == null) ? 43 : $employeeCode.hashCode());
        Object $employeeName = getEmployeeName();
        result = result * PRIME + (($employeeName == null) ? 43 : $employeeName.hashCode());
        Object $attendanceDate = getAttendanceDate();
        result = result * PRIME + (($attendanceDate == null) ? 43 : $attendanceDate.hashCode());
        Object $attendanceTime = getAttendanceTime();
        result = result * PRIME + (($attendanceTime == null) ? 43 : $attendanceTime.hashCode());
        Object $verificationMode = getVerificationMode();
        result = result * PRIME + (($verificationMode == null) ? 43 : $verificationMode.hashCode());
        Object $status = getStatus();
        result = result * PRIME + (($status == null) ? 43 : $status.hashCode());
        Object $remarks = getRemarks();
        result = result * PRIME + (($remarks == null) ? 43 : $remarks.hashCode());
        Object $createdAt = getCreatedAt();
        return result * PRIME + (($createdAt == null) ? 43 : $createdAt.hashCode());
    }

    @Override
    public String toString() {
        return "Attendance(attendanceId=" + getAttendanceId() + ", companyName=" + getCompanyName() + ", employee=" + getEmployee() + ", employeeCode=" + getEmployeeCode() + ", employeeName=" + getEmployeeName() + ", attendanceDate=" + getAttendanceDate() + ", attendanceTime=" + getAttendanceTime() + ", verificationMode=" + getVerificationMode() + ", status=" + getStatus() + ", remarks=" + getRemarks() + ", createdAt=" + getCreatedAt() + ")";
    }
}
