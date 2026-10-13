package com.spicesshop.billing.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProblemReportServiceTest {

    @Test
    void redactsPasswordLines() {
        assertEquals("[redacted line]", ProblemReportService.redactLine("spring.datasource.password=secret"));
    }

    @Test
    void keepsNormalLogLines() {
        String line = "2026-10-11 INFO Invoice saved BVT/1";
        assertEquals(line, ProblemReportService.redactLine(line));
    }

    @Test
    void redactsJwtSecret() {
        assertTrue(ProblemReportService.redactLine("jwt.secret=abc").contains("redacted"));
    }
}
