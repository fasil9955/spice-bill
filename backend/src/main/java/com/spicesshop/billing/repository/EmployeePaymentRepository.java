package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.EmployeePayment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmployeePaymentRepository extends JpaRepository<EmployeePayment, Integer> {

    List<EmployeePayment> findByCompanyNameAndEmployeeIdOrderByPaymentDateDescCreatedAtDesc(String companyName, Integer employeeId);
}
