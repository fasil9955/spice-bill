package com.spicesshop.billing.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class CompanyExtractor {

    @Autowired
    private JwtUtil jwtUtil;

    public String extractCompanyFromRequest(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            return this.jwtUtil.extractCompanyName(token);
        }
        return null;
    }
}
