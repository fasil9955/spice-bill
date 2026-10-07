package com.spicesshop.billing.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spicesshop.billing.dto.*;
import com.spicesshop.billing.model.User;
import com.spicesshop.billing.repository.UserRepository;
import com.spicesshop.billing.util.JwtUtil;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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

    @Autowired
    private ObjectMapper objectMapper;

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
        if (request.getCustomerCareEmail() != null && !request.getCustomerCareEmail().isBlank()) {
            admin.setCustomerCareEmail(request.getCustomerCareEmail().trim());
        }
        User savedAdmin = this.userRepository.save(admin);

        User cashier = new User();
        cashier.setCompanyName(request.getCompanyName());
        cashier.setRole(User.Role.CASHIER);
        cashier.setPassword(this.passwordEncoder.encode(request.getCashierPassword()));
        cashier.setGstNumber(request.getGstNumber());
        cashier.setFssaiLicense(request.getFssaiLicense());
        cashier.setAddress(request.getAddress());
        cashier.setPhoneNumber(request.getPhoneNumber());
        if (request.getCustomerCareEmail() != null && !request.getCustomerCareEmail().isBlank()) {
            cashier.setCustomerCareEmail(request.getCustomerCareEmail().trim());
        }
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
            admin.getBarcodeLabelCompanyName(),
            admin.getGstNumber(),
            admin.getFssaiLicense(),
            admin.getAddress(),
            admin.getPhoneNumber(),
            admin.getPackingLicenceNo(),
            admin.getCustomerCareNumber(),
            admin.getCustomerCareEmail(),
            admin.getBankName(),
            admin.getAccountNumber(),
            admin.getIfscCode(),
            admin.getBranchName(),
            admin.getB2bInvoiceStart(),
            admin.getPrintGatePass(),
            readUpiAccounts(admin.getUpiAccountsJson())
        );
    }

    @Transactional
    public CompanyDetailsResponse updateCompanyDetails(String companyName, CompanyDetailsRequest request) {
        User admin = this.userRepository.findByCompanyNameAndRole(companyName, User.Role.ADMIN)
            .orElseThrow(() -> new RuntimeException("Company not found"));

        User cashier = this.userRepository.findByCompanyNameAndRole(companyName, User.Role.CASHIER)
            .orElseThrow(() -> new RuntimeException("Cashier not found"));

        String barcodeLabelName = request.getBarcodeLabelCompanyName();
        if (barcodeLabelName != null) {
            barcodeLabelName = barcodeLabelName.trim();
            if (barcodeLabelName.isEmpty()) {
                barcodeLabelName = null;
            }
        }
        admin.setBarcodeLabelCompanyName(barcodeLabelName);
        admin.setGstNumber(request.getGstNumber());
        admin.setFssaiLicense(request.getFssaiLicense());
        admin.setAddress(request.getAddress());
        admin.setPhoneNumber(request.getPhoneNumber());
        admin.setPackingLicenceNo(request.getPackingLicenceNo());
        admin.setCustomerCareNumber(request.getCustomerCareNumber());
        admin.setCustomerCareEmail(request.getCustomerCareEmail());
        admin.setBankName(request.getBankName());
        admin.setAccountNumber(request.getAccountNumber());
        admin.setIfscCode(request.getIfscCode());
        admin.setBranchName(request.getBranchName());
        admin.setB2bInvoiceStart(request.getB2bInvoiceStart());
        admin.setPrintGatePass(request.getPrintGatePass() == null ? Boolean.TRUE : request.getPrintGatePass());
        admin.setUpiAccountsJson(writeUpiAccounts(request.getUpiAccounts()));
        this.userRepository.save(admin);

        cashier.setBarcodeLabelCompanyName(barcodeLabelName);
        cashier.setGstNumber(request.getGstNumber());
        cashier.setFssaiLicense(request.getFssaiLicense());
        cashier.setAddress(request.getAddress());
        cashier.setPhoneNumber(request.getPhoneNumber());
        cashier.setPackingLicenceNo(request.getPackingLicenceNo());
        cashier.setCustomerCareNumber(request.getCustomerCareNumber());
        cashier.setCustomerCareEmail(request.getCustomerCareEmail());
        cashier.setBankName(request.getBankName());
        cashier.setAccountNumber(request.getAccountNumber());
        cashier.setIfscCode(request.getIfscCode());
        cashier.setBranchName(request.getBranchName());
        cashier.setB2bInvoiceStart(request.getB2bInvoiceStart());
        cashier.setPrintGatePass(request.getPrintGatePass() == null ? Boolean.TRUE : request.getPrintGatePass());
        cashier.setUpiAccountsJson(admin.getUpiAccountsJson());
        this.userRepository.save(cashier);

        return new CompanyDetailsResponse(
            admin.getCompanyName(),
            admin.getBarcodeLabelCompanyName(),
            admin.getGstNumber(),
            admin.getFssaiLicense(),
            admin.getAddress(),
            admin.getPhoneNumber(),
            admin.getPackingLicenceNo(),
            admin.getCustomerCareNumber(),
            admin.getCustomerCareEmail(),
            admin.getBankName(),
            admin.getAccountNumber(),
            admin.getIfscCode(),
            admin.getBranchName(),
            admin.getB2bInvoiceStart(),
            admin.getPrintGatePass(),
            readUpiAccounts(admin.getUpiAccountsJson())
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

    private List<UpiAccountDto> readUpiAccounts(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return sanitizeUpiAccounts(this.objectMapper.readValue(json, new TypeReference<List<UpiAccountDto>>() {}));
        } catch (Exception e) {
            return List.of();
        }
    }

    private String writeUpiAccounts(List<UpiAccountDto> list) {
        try {
            return this.objectMapper.writeValueAsString(sanitizeUpiAccounts(list));
        } catch (Exception e) {
            return "[]";
        }
    }

    private List<UpiAccountDto> sanitizeUpiAccounts(List<UpiAccountDto> list) {
        if (list == null || list.isEmpty()) {
            return List.of();
        }
        List<UpiAccountDto> out = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (UpiAccountDto row : list) {
            if (row == null || row.getLabel() == null) {
                continue;
            }
            String label = row.getLabel().trim();
            if (label.isEmpty()) {
                continue;
            }
            String key = label.toLowerCase();
            if (!seen.add(key)) {
                continue;
            }
            if (label.length() > 40) {
                label = label.substring(0, 40);
            }
            String upiId = row.getUpiId() != null ? row.getUpiId().trim() : "";
            if (upiId.length() > 80) {
                upiId = upiId.substring(0, 80);
            }
            out.add(new UpiAccountDto(label, upiId));
            if (out.size() >= 12) {
                break;
            }
        }
        return out;
    }
}
