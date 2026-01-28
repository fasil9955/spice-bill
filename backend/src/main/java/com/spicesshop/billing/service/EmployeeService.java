package com.spicesshop.billing.service;

import com.spicesshop.billing.model.Employee;
import com.spicesshop.billing.repository.EmployeeRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class EmployeeService {

    @Autowired
    private EmployeeRepository employeeRepository;

    public List<Employee> getAllEmployees(String companyName) {
        return this.employeeRepository.findByCompanyName(companyName);
    }

    public Optional<Employee> getEmployeeById(Integer id) {
        return this.employeeRepository.findById(id);
    }

    public Employee createEmployee(Employee employee) {
        if (this.employeeRepository.existsByCompanyNameAndEmployeeCode(employee.getCompanyName(), employee.getEmployeeCode())) {
            throw new RuntimeException("Employee code already exists: " + employee.getEmployeeCode());
        }
        return this.employeeRepository.save(employee);
    }

    public Employee updateEmployee(Integer id, Employee employee) {
        Optional<Employee> existingOpt = this.employeeRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Employee not found");
        }

        Employee existing = existingOpt.get();
        if (!existing.getEmployeeCode().equals(employee.getEmployeeCode()) && 
            this.employeeRepository.existsByCompanyNameAndEmployeeCode(employee.getCompanyName(), employee.getEmployeeCode())) {
            throw new RuntimeException("Employee code already exists: " + employee.getEmployeeCode());
        }

        existing.setEmployeeName(employee.getEmployeeName());
        existing.setEmployeeCode(employee.getEmployeeCode());
        existing.setPhone(employee.getPhone());
        existing.setEmail(employee.getEmail());
        existing.setDepartment(employee.getDepartment());
        existing.setDesignation(employee.getDesignation());
        existing.setAadharDocument(employee.getAadharDocument());
        existing.setPhoto(employee.getPhoto());
        existing.setIsActive(employee.getIsActive());

        return this.employeeRepository.save(existing);
    }

    public void deleteEmployee(Integer id) {
        this.employeeRepository.deleteById(id);
    }
}
