package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.EmployeeAdvanceRequest;
import com.spicesshop.billing.dto.EmployeeSalaryClearanceRequest;
import com.spicesshop.billing.model.Employee;
import com.spicesshop.billing.model.EmployeeAdvance;
import com.spicesshop.billing.model.EmployeeSalaryClearance;
import com.spicesshop.billing.repository.EmployeeAdvanceRepository;
import com.spicesshop.billing.repository.EmployeeRepository;
import com.spicesshop.billing.repository.EmployeeSalaryClearanceRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeAccountService {

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private EmployeeAdvanceRepository employeeAdvanceRepository;

    @Autowired
    private EmployeeSalaryClearanceRepository employeeSalaryClearanceRepository;

    private Employee getEmployeeOrThrow(Integer employeeId, String companyName) {
        Employee employee = this.employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found"));
        
        if (!employee.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Employee not found or access denied");
        }
        return employee;
    }

    public List<EmployeeAdvance> getAdvances(String companyName, Integer employeeId) {
        getEmployeeOrThrow(employeeId, companyName);
        return this.employeeAdvanceRepository.findByCompanyNameAndEmployeeIdOrderByRecordDateDescCreatedAtDesc(companyName, employeeId);
    }

    @Transactional
    public EmployeeAdvance createAdvance(String companyName, EmployeeAdvanceRequest request) {
        if (request == null || request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }

        getEmployeeOrThrow(request.getEmployeeId(), companyName);

        EmployeeAdvance advance = new EmployeeAdvance();
        advance.setCompanyName(companyName);
        advance.setEmployeeId(request.getEmployeeId());
        advance.setAmount(request.getAmount());
        advance.setPaymentMethod((request.getPaymentMethod() != null) ? request.getPaymentMethod() : "CASH");
        
        if (request.getRecordDate() != null && !request.getRecordDate().isBlank()) {
            advance.setRecordDate(LocalDate.parse(request.getRecordDate()));
        }
        return this.employeeAdvanceRepository.save(advance);
    }

    public List<EmployeeSalaryClearance> getSalaryClearances(String companyName, Integer employeeId) {
        getEmployeeOrThrow(employeeId, companyName);
        return this.employeeSalaryClearanceRepository.findByCompanyNameAndEmployeeIdOrderByClearedAtDesc(companyName, employeeId);
    }

    @Transactional
    public EmployeeSalaryClearance clearSalary(String companyName, EmployeeSalaryClearanceRequest request) {
        if (request == null || request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required");
        }
        if (request.getMonth() == null || request.getMonth().isBlank()) {
            throw new RuntimeException("Month is required");
        }
        if (request.getSalaryAmount() == null || request.getSalaryAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Salary amount must be greater than 0");
        }

        getEmployeeOrThrow(request.getEmployeeId(), companyName);

        YearMonth yearMonth = YearMonth.parse(request.getMonth());
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        BigDecimal totalTaken;
        if (request.getTotalTaken() != null) {
            totalTaken = request.getTotalTaken();
        } else {
            totalTaken = this.employeeAdvanceRepository.sumAmountForMonth(companyName, request.getEmployeeId(), startDate, endDate);
            if (totalTaken == null) {
                totalTaken = BigDecimal.ZERO;
            }
        }

        BigDecimal netPay = request.getSalaryAmount().subtract(totalTaken);

        EmployeeSalaryClearance clearance = this.employeeSalaryClearanceRepository
            .findByCompanyNameAndEmployeeIdAndSalaryMonth(companyName, request.getEmployeeId(), request.getMonth())
            .orElseGet(EmployeeSalaryClearance::new);

        clearance.setCompanyName(companyName);
        clearance.setEmployeeId(request.getEmployeeId());
        clearance.setSalaryMonth(request.getMonth());
        clearance.setSalaryAmount(request.getSalaryAmount());
        clearance.setTotalTaken(totalTaken);
        clearance.setNetPay(netPay);
        clearance.setClearedAt(LocalDateTime.now());

        return this.employeeSalaryClearanceRepository.save(clearance);
    }
}
