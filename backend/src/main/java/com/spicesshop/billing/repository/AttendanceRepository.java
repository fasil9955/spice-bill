package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.Attendance;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Integer> {
    List<Attendance> findByCompanyName(String companyName);
    
    List<Attendance> findByCompanyNameAndEmployee_EmployeeId(String companyName, Integer employeeId);
    
    List<Attendance> findByCompanyNameAndAttendanceDate(String companyName, LocalDate attendanceDate);
    
    List<Attendance> findByCompanyNameAndAttendanceDateBetween(String companyName, LocalDate startDate, LocalDate endDate);
    
    @Query("SELECT a FROM Attendance a WHERE a.companyName = :companyName AND a.employee.employeeId = :employeeId AND a.attendanceDate BETWEEN :startDate AND :endDate ORDER BY a.attendanceDate DESC, a.attendanceTime DESC")
    List<Attendance> findByCompanyNameAndEmployeeIdAndDateRange(
        @Param("companyName") String companyName, 
        @Param("employeeId") Integer employeeId, 
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
}
