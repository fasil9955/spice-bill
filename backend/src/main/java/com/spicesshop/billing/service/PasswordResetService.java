package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.ForgotPasswordRequest;
import com.spicesshop.billing.dto.ResetPasswordRequest;
import com.spicesshop.billing.model.PasswordResetToken;
import com.spicesshop.billing.model.User;
import com.spicesshop.billing.repository.PasswordResetTokenRepository;
import com.spicesshop.billing.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final String GENERIC_SENT =
        "If this company and role match, a 6-digit OTP has been sent to fasilpvr52@gmail.com.";
    private static final SecureRandom RANDOM = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${app.password-reset.to:fasilpvr52@gmail.com}")
    private String passwordResetTo;

    @Transactional
    public String requestReset(ForgotPasswordRequest request) {
        if (!isMailConfigured()) {
            throw new RuntimeException(
                "Password reset email is not set up. Add MAIL_PASSWORD (Gmail App Password) on the server.");
        }

        String company = request.getCompanyName() != null ? request.getCompanyName().trim() : "";
        User.Role role;
        try {
            role = User.Role.valueOf(request.getRole() != null ? request.getRole().trim().toUpperCase() : "");
        } catch (IllegalArgumentException e) {
            return GENERIC_SENT;
        }

        if (company.isEmpty()) {
            return GENERIC_SENT;
        }

        User user = this.userRepository.findByCompanyNameAndRole(company, role).orElse(null);
        if (user == null) {
            return GENERIC_SENT;
        }

        for (PasswordResetToken previous : this.tokenRepository.findByUserAndUsedAtIsNull(user)) {
            previous.setUsedAt(LocalDateTime.now());
            this.tokenRepository.save(previous);
        }

        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(hashOtp(user.getUserId(), otp));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        this.tokenRepository.save(token);

        sendOtpEmail(this.passwordResetTo, user.getCompanyName(), user.getRole().name(), otp);
        return GENERIC_SENT;
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String otp = request.getOtp() != null ? request.getOtp().trim().replaceAll("\\s+", "") : "";
        if (otp.isEmpty()) {
            throw new RuntimeException("Enter the OTP sent to your email");
        }
        if (request.getNewPassword() == null || !request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new RuntimeException("New password and confirm password do not match");
        }
        if (request.getNewPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters long");
        }

        String company = request.getCompanyName() != null ? request.getCompanyName().trim() : "";
        User.Role role;
        try {
            role = User.Role.valueOf(request.getRole() != null ? request.getRole().trim().toUpperCase() : "");
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid company or role");
        }

        User user = this.userRepository.findByCompanyNameAndRole(company, role)
            .orElseThrow(() -> new RuntimeException("Invalid OTP, or it has expired"));

        PasswordResetToken token = this.tokenRepository.findByTokenHash(hashOtp(user.getUserId(), otp))
            .orElseThrow(() -> new RuntimeException("Invalid OTP, or it has expired"));

        if (token.getUsedAt() != null) {
            throw new RuntimeException("This OTP has already been used. Request a new one.");
        }
        if (token.getExpiresAt() == null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("OTP has expired. Request a new one from the login page.");
        }
        if (token.getUser() == null || !user.getUserId().equals(token.getUser().getUserId())) {
            throw new RuntimeException("Invalid OTP, or it has expired");
        }

        user.setPassword(this.passwordEncoder.encode(request.getNewPassword()));
        this.userRepository.save(user);

        token.setUsedAt(LocalDateTime.now());
        this.tokenRepository.save(token);

        for (PasswordResetToken other : this.tokenRepository.findByUserAndUsedAtIsNull(user)) {
            other.setUsedAt(LocalDateTime.now());
            this.tokenRepository.save(other);
        }
    }

    private boolean isMailConfigured() {
        return this.mailSender != null && StringUtils.hasText(this.mailUsername);
    }

    private void sendOtpEmail(String to, String companyName, String role, String otp) {
        String from = StringUtils.hasText(this.mailFrom) ? this.mailFrom.trim() : this.mailUsername.trim();

        try {
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Your Spices Billing password OTP");
            helper.setText(
                "You asked to reset the " + role + " password for " + companyName + ".\n\n"
                    + "Your OTP is: " + otp + "\n\n"
                    + "Enter this code on the login page. It expires in 10 minutes.\n"
                    + "If you did not request this, you can ignore this email.\n",
                false);
            this.mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send password OTP email to {}", to, e);
            throw new RuntimeException("Could not send the OTP email. Check the mail settings on the server.");
        }
    }

    private String hashOtp(Integer userId, String otp) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String material = (userId != null ? userId : 0) + ":" + otp;
            byte[] hashed = digest.digest(material.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
