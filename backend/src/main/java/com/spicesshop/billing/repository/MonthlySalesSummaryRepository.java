package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.MonthlySalesSummary;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface MonthlySalesSummaryRepository extends JpaRepository<MonthlySalesSummary, Integer> {
    Optional<MonthlySalesSummary> findByCompanyNameAndYearAndMonth(String companyName, Integer year, Integer month);
    
    @Query("SELECT m FROM MonthlySalesSummary m WHERE m.companyName = :companyName AND m.year = :year ORDER BY m.month")
    List<MonthlySalesSummary> findByCompanyNameAndYear(@Param("companyName") String companyName, @Param("year") Integer year);
    
    Optional<MonthlySalesSummary> findByYearAndMonth(Integer year, Integer month);
    
    @Query("SELECT m FROM MonthlySalesSummary m WHERE m.year = :year ORDER BY m.month")
    List<MonthlySalesSummary> findByYear(@Param("year") Integer year);
    
    @Query("SELECT m FROM MonthlySalesSummary m WHERE m.year = :year AND m.month = :month")
    Optional<MonthlySalesSummary> findByYearAndMonthQuery(@Param("year") Integer year, @Param("month") Integer month);
}
