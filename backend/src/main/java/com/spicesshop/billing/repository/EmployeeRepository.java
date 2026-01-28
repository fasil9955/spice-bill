package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.Employee;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {
    List<Employee> findByCompanyName(String companyName);
    
    Optional<Employee> findByCompanyNameAndEmployeeCode(String companyName, String employeeCode);
    
    List<Employee> findByCompanyNameAndIsActive(String companyName, Boolean isActive);
    
    boolean existsByCompanyNameAndEmployeeCode(String companyName, String employeeCode);
}
