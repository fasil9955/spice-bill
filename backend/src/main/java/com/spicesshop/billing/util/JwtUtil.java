package com.spicesshop.billing.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(this.secret.getBytes());
    }

    public String extractCompanyName(String token) {
        return extractClaim(token, claims -> (String) claims.get("companyName"));
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> (String) claims.get("role"));
    }

    public Integer extractUserId(String token) {
        return extractClaim(token, claims -> {
            Object v = claims.get("userId");
            if (v == null) return null;
            if (v instanceof Number) return ((Number) v).intValue();
            return Integer.parseInt(v.toString());
        });
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    private Claims extractAllClaims(String token) {
        try {
            return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            // Stay logged in until the user presses Logout — ignore clock expiry.
            return e.getClaims();
        }
    }

    public String generateToken(String companyName, String role, Integer userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("companyName", companyName);
        claims.put("role", role);
        claims.put("userId", userId);
        return createToken(claims, companyName);
    }

    private String createToken(Map<String, Object> claims, String subject) {
        return Jwts.builder()
            .claims(claims)
            .subject(subject)
            .issuedAt(new Date(System.currentTimeMillis()))
            .signWith(getSigningKey())
            .compact();
    }

    public Boolean validateToken(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
