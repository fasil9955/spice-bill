package com.spicesshop.billing.service;

import com.spicesshop.billing.model.Attendance;
import com.spicesshop.billing.model.Employee;
import com.spicesshop.billing.repository.AttendanceRepository;
import com.spicesshop.billing.repository.EmployeeRepository;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    public List<Attendance> getAllAttendance(String companyName) {
        return this.attendanceRepository.findByCompanyName(companyName);
    }

    public List<Attendance> getAttendanceByDate(String companyName, LocalDate date) {
        return this.attendanceRepository.findByCompanyNameAndAttendanceDate(companyName, date);
    }

    public List<Attendance> getAttendanceByDateRange(String companyName, LocalDate startDate, LocalDate endDate) {
        return this.attendanceRepository.findByCompanyNameAndAttendanceDateBetween(companyName, startDate, endDate);
    }

    public List<Attendance> getAttendanceByEmployee(String companyName, Integer employeeId) {
        return this.attendanceRepository.findByCompanyNameAndEmployee_EmployeeId(companyName, employeeId);
    }

    public List<Attendance> getAttendanceByEmployeeAndDateRange(String companyName, Integer employeeId, LocalDate startDate, LocalDate endDate) {
        return this.attendanceRepository.findByCompanyNameAndEmployeeIdAndDateRange(companyName, employeeId, startDate, endDate);
    }

    public Attendance createAttendance(String companyName, Attendance attendance) {
        if (attendance.getEmployee() == null || attendance.getEmployee().getEmployeeId() == null) {
            throw new RuntimeException("Employee ID is required");
        }
        
        Optional<Employee> employeeOpt = this.employeeRepository.findById(attendance.getEmployee().getEmployeeId());
        if (employeeOpt.isEmpty()) {
            throw new RuntimeException("Employee not found");
        }

        Employee employee = employeeOpt.get();
        attendance.setCompanyName(companyName);
        attendance.setEmployee(employee);
        attendance.setEmployeeCode(employee.getEmployeeCode());
        attendance.setEmployeeName(employee.getEmployeeName());

        if (attendance.getVerificationMode() == null || attendance.getVerificationMode().isEmpty()) {
            attendance.setVerificationMode("Manual");
        }

        return this.attendanceRepository.save(attendance);
    }

    public Attendance updateAttendance(String companyName, Integer attendanceId, Attendance attendance) {
        Optional<Attendance> existingOpt = this.attendanceRepository.findById(attendanceId);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Attendance record not found");
        }

        Attendance existing = existingOpt.get();
        if (!existing.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Attendance record not found or access denied");
        }

        if (attendance.getAttendanceDate() != null) {
            existing.setAttendanceDate(attendance.getAttendanceDate());
        }
        if (attendance.getAttendanceTime() != null) {
            existing.setAttendanceTime(attendance.getAttendanceTime());
        }
        if (attendance.getStatus() != null) {
            existing.setStatus(attendance.getStatus());
        }
        if (attendance.getRemarks() != null) {
            existing.setRemarks(attendance.getRemarks());
        }

        return this.attendanceRepository.save(existing);
    }

    public Map<String, Object> getMonthlyReport(String companyName, Integer year, Integer month) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        List<Attendance> allAttendance = this.attendanceRepository.findByCompanyNameAndAttendanceDateBetween(companyName, startDate, endDate);
        List<Employee> allEmployees = this.employeeRepository.findByCompanyName(companyName);

        Map<Integer, Map<String, Object>> employeeStats = new HashMap<>();

        for (Employee emp : allEmployees) {
            Map<String, Object> stats = new HashMap<>();
            stats.put("employeeId", emp.getEmployeeId());
            stats.put("employeeName", emp.getEmployeeName());
            stats.put("employeeCode", emp.getEmployeeCode());
            stats.put("presentDays", 0);
            stats.put("absentDays", 0);
            stats.put("halfDays", 0);
            stats.put("totalDays", endDate.getDayOfMonth());
            employeeStats.put(emp.getEmployeeId(), stats);
        }

        for (Attendance att : allAttendance) {
            Integer empId = att.getEmployee().getEmployeeId();
            Map<String, Object> stats = employeeStats.get(empId);
            if (stats != null) {
                if (att.getStatus() == Attendance.AttendanceStatus.PRESENT) {
                    stats.put("presentDays", (Integer) stats.get("presentDays") + 1);
                } else if (att.getStatus() == Attendance.AttendanceStatus.ABSENT) {
                    stats.put("absentDays", (Integer) stats.get("absentDays") + 1);
                } else if (att.getStatus() == Attendance.AttendanceStatus.HALF_DAY) {
                    stats.put("halfDays", (Integer) stats.get("halfDays") + 1);
                }
            }
        }

        Map<String, Object> report = new HashMap<>();
        report.put("year", year);
        report.put("month", month);
        report.put("startDate", startDate.toString());
        report.put("endDate", endDate.toString());
        report.put("totalEmployees", allEmployees.size());
        report.put("employeeStats", new ArrayList<>(employeeStats.values()));

        return report;
    }

    public void deleteAttendance(String companyName, Integer attendanceId) {
        Optional<Attendance> existingOpt = this.attendanceRepository.findById(attendanceId);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Attendance record not found");
        }

        Attendance existing = existingOpt.get();
        if (!existing.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Attendance record not found or access denied");
        }

        this.attendanceRepository.delete(existing);
    }
}
