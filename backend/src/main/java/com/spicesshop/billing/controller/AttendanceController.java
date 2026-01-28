package com.spicesshop.billing.controller;

import com.spicesshop.billing.model.Attendance;
import com.spicesshop.billing.service.AttendanceService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/attendance"})
@CrossOrigin(origins = {"*"})
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping
    public ResponseEntity<?> getAttendance(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            List<Attendance> records = (date != null) ? 
                this.attendanceService.getAttendanceByDate(companyName, date) : 
                this.attendanceService.getAllAttendance(companyName);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/range"})
    public ResponseEntity<?> getAttendanceRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate, 
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            List<Attendance> records = this.attendanceService.getAttendanceByDateRange(companyName, startDate, endDate);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/employee/{employeeId}"})
    public ResponseEntity<?> getEmployeeAttendance(
            @PathVariable Integer employeeId, 
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate, 
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            List<Attendance> records = (startDate != null && endDate != null) ? 
                this.attendanceService.getAttendanceByEmployeeAndDateRange(companyName, employeeId, startDate, endDate) : 
                this.attendanceService.getAttendanceByEmployee(companyName, employeeId);
            return ResponseEntity.ok(records);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/report/monthly"})
    public ResponseEntity<?> getMonthlyReport(
            @RequestParam Integer year, 
            @RequestParam Integer month, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.attendanceService.getMonthlyReport(companyName, year, month));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createAttendance(@RequestBody Attendance attendance, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.attendanceService.createAttendance(companyName, attendance));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping({"/{id}"})
    public ResponseEntity<?> updateAttendance(@PathVariable Integer id, @RequestBody Attendance attendance, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.attendanceService.updateAttendance(companyName, id, attendance));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<?> deleteAttendance(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            this.attendanceService.deleteAttendance(companyName, id);
            return ResponseEntity.ok(Map.of("message", "Attendance record deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
