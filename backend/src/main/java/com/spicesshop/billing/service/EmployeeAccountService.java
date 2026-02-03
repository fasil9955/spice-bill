package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.EmployeeAdvanceRequest;
import com.spicesshop.billing.dto.EmployeeLedgerEntryRequest;
import com.spicesshop.billing.dto.EmployeeSalaryClearanceRequest;
import com.spicesshop.billing.model.Employee;
import com.spicesshop.billing.model.EmployeeAdvance;
import com.spicesshop.billing.dto.EmployeePaymentRequest;
import com.spicesshop.billing.model.EmployeeLedgerEntry;
import com.spicesshop.billing.model.EmployeePayment;
import com.spicesshop.billing.model.EmployeeSalaryClearance;
import com.spicesshop.billing.repository.EmployeeAdvanceRepository;
import com.spicesshop.billing.repository.EmployeeLedgerEntryRepository;
import com.spicesshop.billing.repository.EmployeePaymentRepository;
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
    private EmployeeLedgerEntryRepository employeeLedgerEntryRepository;

    @Autowired
    private EmployeeSalaryClearanceRepository employeeSalaryClearanceRepository;

    @Autowired
    private EmployeePaymentRepository employeePaymentRepository;

    private Employee getEmployeeOrThrow(Integer employeeId, String companyName) {
        Employee employee = this.employeeRepository.findById(employeeId)
            .orElseThrow(() -> new RuntimeException("Employee not found"));
        
        if (!employee.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Employee not found or access denied");
        }
        return employee;
    }

    /** Ledger: all entries for employee (date ascending for running balance). */
    public List<EmployeeLedgerEntry> getLedger(String companyName, Integer employeeId) {
        getEmployeeOrThrow(employeeId, companyName);
        return this.employeeLedgerEntryRepository.findByCompanyNameAndEmployeeIdOrderByEntryDateAscCreatedAtAsc(companyName, employeeId);
    }

    @Transactional
    public EmployeeLedgerEntry addLedgerEntry(String companyName, EmployeeLedgerEntryRequest request) {
        if (request == null || request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required");
        }
        String type = (request.getEntryType() != null) ? request.getEntryType().trim().toUpperCase() : "";
        if (!EmployeeLedgerEntry.TYPE_ADVANCE.equals(type) && !EmployeeLedgerEntry.TYPE_REPAYMENT.equals(type)) {
            throw new RuntimeException("Entry type must be ADVANCE or REPAYMENT");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }
        getEmployeeOrThrow(request.getEmployeeId(), companyName);

        EmployeeLedgerEntry entry = new EmployeeLedgerEntry();
        entry.setCompanyName(companyName);
        entry.setEmployeeId(request.getEmployeeId());
        entry.setEntryType(type);
        entry.setAmount(request.getAmount());
        entry.setPaymentMethod((request.getPaymentMethod() != null) ? request.getPaymentMethod() : "CASH");
        entry.setReference(request.getReference());
        if (request.getEntryDate() != null && !request.getEntryDate().isBlank()) {
            entry.setEntryDate(LocalDate.parse(request.getEntryDate()));
        }
        return this.employeeLedgerEntryRepository.save(entry);
    }

    /** @deprecated Use getLedger. Returns advances from ledger for backward compatibility. */
    @Deprecated
    public List<EmployeeAdvance> getAdvances(String companyName, Integer employeeId) {
        getEmployeeOrThrow(employeeId, companyName);
        return this.employeeAdvanceRepository.findByCompanyNameAndEmployeeIdOrderByRecordDateDescCreatedAtDesc(companyName, employeeId);
    }

    /** @deprecated Use addLedgerEntry with type ADVANCE. */
    @Deprecated
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

    @Transactional
    public void deleteAdvance(String companyName, Integer advanceId) {
        EmployeeAdvance advance = this.employeeAdvanceRepository.findById(advanceId)
            .orElseThrow(() -> new RuntimeException("Advance not found"));
        if (!advance.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Advance not found or access denied");
        }
        this.employeeAdvanceRepository.delete(advance);
    }

    public List<EmployeeSalaryClearance> getSalaryClearances(String companyName, Integer employeeId) {
        getEmployeeOrThrow(employeeId, companyName);
        return this.employeeSalaryClearanceRepository.findByCompanyNameAndEmployeeIdOrderByClearedAtDesc(companyName, employeeId);
    }

    /** Save month account details (salary, deductions, payments) without marking as cleared. Draft record has clearedAt = null. */
    @Transactional
    public EmployeeSalaryClearance saveMonthDetails(String companyName, EmployeeSalaryClearanceRequest request) {
        if (request == null || request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required");
        }
        if (request.getMonth() == null || request.getMonth().isBlank()) {
            throw new RuntimeException("Month is required");
        }
        BigDecimal salaryAmount = request.getSalaryAmount() != null ? request.getSalaryAmount() : BigDecimal.ZERO;
        if (salaryAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException("Salary amount cannot be negative");
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

        BigDecimal netPay = salaryAmount.subtract(totalTaken);
        BigDecimal totalPaymentsGiven = (request.getTotalPaymentsGiven() != null) ? request.getTotalPaymentsGiven() : BigDecimal.ZERO;
        BigDecimal closingBalance = netPay.subtract(totalPaymentsGiven);

        EmployeeSalaryClearance clearance = this.employeeSalaryClearanceRepository
            .findByCompanyNameAndEmployeeIdAndSalaryMonth(companyName, request.getEmployeeId(), request.getMonth())
            .orElseGet(EmployeeSalaryClearance::new);

        clearance.setCompanyName(companyName);
        clearance.setEmployeeId(request.getEmployeeId());
        clearance.setSalaryMonth(request.getMonth());
        clearance.setSalaryAmount(salaryAmount);
        clearance.setTotalTaken(totalTaken);
        clearance.setNetPay(netPay);
        clearance.setClosingBalance(closingBalance);
        // Do not set clearedAt – remains null for draft/saved details
        return this.employeeSalaryClearanceRepository.save(clearance);
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

        BigDecimal totalPaymentsGiven = (request.getTotalPaymentsGiven() != null) ? request.getTotalPaymentsGiven() : BigDecimal.ZERO;
        BigDecimal closingBalance = netPay.subtract(totalPaymentsGiven);

        clearance.setCompanyName(companyName);
        clearance.setEmployeeId(request.getEmployeeId());
        clearance.setSalaryMonth(request.getMonth());
        clearance.setSalaryAmount(request.getSalaryAmount());
        clearance.setTotalTaken(totalTaken);
        clearance.setNetPay(netPay);
        clearance.setClosingBalance(closingBalance);
        clearance.setClearedAt(LocalDateTime.now());

        return this.employeeSalaryClearanceRepository.save(clearance);
    }

    /** Payments we gave to the employee (salary payout). */
    public List<EmployeePayment> getPayments(String companyName, Integer employeeId) {
        getEmployeeOrThrow(employeeId, companyName);
        return this.employeePaymentRepository.findByCompanyNameAndEmployeeIdOrderByPaymentDateDescCreatedAtDesc(companyName, employeeId);
    }

    @Transactional
    public EmployeePayment addPayment(String companyName, EmployeePaymentRequest request) {
        if (request == null || request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required");
        }
        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Amount must be greater than 0");
        }
        getEmployeeOrThrow(request.getEmployeeId(), companyName);

        EmployeePayment payment = new EmployeePayment();
        payment.setCompanyName(companyName);
        payment.setEmployeeId(request.getEmployeeId());
        payment.setAmount(request.getAmount());
        payment.setRemark(request.getRemark());
        if (request.getPaymentDate() != null && !request.getPaymentDate().isBlank()) {
            payment.setPaymentDate(LocalDate.parse(request.getPaymentDate()));
        } else {
            payment.setPaymentDate(LocalDate.now());
        }
        return this.employeePaymentRepository.save(payment);
    }

    @Transactional
    public void deletePayment(String companyName, Integer paymentId) {
        EmployeePayment payment = this.employeePaymentRepository.findById(paymentId)
            .orElseThrow(() -> new RuntimeException("Payment not found"));
        if (!payment.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Payment not found or access denied");
        }
        this.employeePaymentRepository.delete(payment);
    }
}
