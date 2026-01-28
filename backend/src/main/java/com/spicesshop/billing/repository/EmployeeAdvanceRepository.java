package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.EmployeeAdvance;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeAdvanceRepository extends JpaRepository<EmployeeAdvance, Integer> {
    List<EmployeeAdvance> findByCompanyNameAndEmployeeIdOrderByRecordDateDescCreatedAtDesc(String companyName, Integer employeeId);
    
    @Query("select coalesce(sum(e.amount), 0) from EmployeeAdvance e where e.companyName = :companyName and e.employeeId = :employeeId and e.recordDate between :startDate and :endDate")
    BigDecimal sumAmountForMonth(
        @Param("companyName") String companyName, 
        @Param("employeeId") Integer employeeId, 
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
}
