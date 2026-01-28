package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.EmployeeSalaryClearance;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeSalaryClearanceRepository extends JpaRepository<EmployeeSalaryClearance, Integer> {
    List<EmployeeSalaryClearance> findByCompanyNameAndEmployeeIdOrderByClearedAtDesc(String companyName, Integer employeeId);
    
    Optional<EmployeeSalaryClearance> findByCompanyNameAndEmployeeIdAndSalaryMonth(String companyName, Integer employeeId, String salaryMonth);
}
