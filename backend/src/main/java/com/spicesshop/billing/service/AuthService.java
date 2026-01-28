package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.*;
import com.spicesshop.billing.model.User;
import com.spicesshop.billing.repository.UserRepository;
import com.spicesshop.billing.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        if (this.userRepository.existsByCompanyNameAndRole(request.getCompanyName(), User.Role.ADMIN) || 
            this.userRepository.existsByCompanyNameAndRole(request.getCompanyName(), User.Role.CASHIER)) {
            throw new RuntimeException("Company already registered. Please login instead.");
        }

        User admin = new User();
        admin.setCompanyName(request.getCompanyName());
        admin.setRole(User.Role.ADMIN);
        admin.setPassword(this.passwordEncoder.encode(request.getAdminPassword()));
        admin.setGstNumber(request.getGstNumber());
        admin.setFssaiLicense(request.getFssaiLicense());
        admin.setAddress(request.getAddress());
        admin.setPhoneNumber(request.getPhoneNumber());
        User savedAdmin = this.userRepository.save(admin);

        User cashier = new User();
        cashier.setCompanyName(request.getCompanyName());
        cashier.setRole(User.Role.CASHIER);
        cashier.setPassword(this.passwordEncoder.encode(request.getCashierPassword()));
        cashier.setGstNumber(request.getGstNumber());
        cashier.setFssaiLicense(request.getFssaiLicense());
        cashier.setAddress(request.getAddress());
        cashier.setPhoneNumber(request.getPhoneNumber());
        User savedCashier = this.userRepository.save(cashier);

        return new SignupResponse(
            "Company registered successfully. You can now login.", 
            savedAdmin.getUserId(), 
            savedCashier.getUserId(), 
            request.getCompanyName()
        );
    }

    public LoginResponse login(LoginRequest request) {
        User.Role role;
        try {
            role = User.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role");
        }

        User user = this.userRepository.findByCompanyNameAndRole(request.getCompanyName(), role)
            .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!this.passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String token = this.jwtUtil.generateToken(user.getCompanyName(), user.getRole().name(), user.getUserId());

        return new LoginResponse(token, user.getRole().name(), user.getCompanyName(), user.getUserId());
    }

    public CompanyDetailsResponse getCompanyDetails(String companyName) {
        User admin = this.userRepository.findByCompanyNameAndRole(companyName, User.Role.ADMIN)
            .orElseThrow(() -> new RuntimeException("Company not found"));

        return new CompanyDetailsResponse(
            admin.getCompanyName(),
            admin.getGstNumber(),
            admin.getFssaiLicense(),
            admin.getAddress(),
            admin.getPhoneNumber(),
            admin.getBankName(),
            admin.getAccountNumber(),
            admin.getIfscCode(),
            admin.getBranchName(),
            admin.getB2bInvoiceStart()
        );
    }

    @Transactional
    public CompanyDetailsResponse updateCompanyDetails(String companyName, CompanyDetailsRequest request) {
        User admin = this.userRepository.findByCompanyNameAndRole(companyName, User.Role.ADMIN)
            .orElseThrow(() -> new RuntimeException("Company not found"));

        User cashier = this.userRepository.findByCompanyNameAndRole(companyName, User.Role.CASHIER)
            .orElseThrow(() -> new RuntimeException("Cashier not found"));

        admin.setGstNumber(request.getGstNumber());
        admin.setFssaiLicense(request.getFssaiLicense());
        admin.setAddress(request.getAddress());
        admin.setPhoneNumber(request.getPhoneNumber());
        admin.setBankName(request.getBankName());
        admin.setAccountNumber(request.getAccountNumber());
        admin.setIfscCode(request.getIfscCode());
        admin.setBranchName(request.getBranchName());
        admin.setB2bInvoiceStart(request.getB2bInvoiceStart());
        this.userRepository.save(admin);

        cashier.setGstNumber(request.getGstNumber());
        cashier.setFssaiLicense(request.getFssaiLicense());
        cashier.setAddress(request.getAddress());
        cashier.setPhoneNumber(request.getPhoneNumber());
        cashier.setBankName(request.getBankName());
        cashier.setAccountNumber(request.getAccountNumber());
        cashier.setIfscCode(request.getIfscCode());
        cashier.setBranchName(request.getBranchName());
        cashier.setB2bInvoiceStart(request.getB2bInvoiceStart());
        this.userRepository.save(cashier);

        return new CompanyDetailsResponse(
            admin.getCompanyName(),
            admin.getGstNumber(),
            admin.getFssaiLicense(),
            admin.getAddress(),
            admin.getPhoneNumber(),
            admin.getBankName(),
            admin.getAccountNumber(),
            admin.getIfscCode(),
            admin.getBranchName(),
            admin.getB2bInvoiceStart()
        );
    }

    @Transactional
    public void changePassword(String companyName, ChangePasswordRequest request) {
        User.Role role;
        try {
            role = User.Role.valueOf(request.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role");
        }

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New password and confirm password do not match");
        }

        if (request.getNewPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters long");
        }

        User user = this.userRepository.findByCompanyNameAndRole(companyName, role)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!this.passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(this.passwordEncoder.encode(request.getNewPassword()));
        this.userRepository.save(user);
    }
}
