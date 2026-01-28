package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.DailySalesReport;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DailySalesReportRepository extends JpaRepository<DailySalesReport, Integer> {
    Optional<DailySalesReport> findByCompanyNameAndReportDate(String companyName, LocalDate date);
    
    @Query("SELECT d FROM DailySalesReport d WHERE d.companyName = :companyName AND d.reportDate BETWEEN :startDate AND :endDate ORDER BY d.reportDate")
    List<DailySalesReport> findByCompanyNameAndDateRange(
        @Param("companyName") String companyName, 
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
    
    Optional<DailySalesReport> findByReportDate(LocalDate date);
    
    @Query("SELECT d FROM DailySalesReport d WHERE d.reportDate BETWEEN :startDate AND :endDate ORDER BY d.reportDate")
    List<DailySalesReport> findByDateRange(
        @Param("startDate") LocalDate startDate, 
        @Param("endDate") LocalDate endDate
    );
}
