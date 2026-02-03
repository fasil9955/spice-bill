package com.spicesshop.billing.controller;

import com.spicesshop.billing.service.GSTR1ExportService;
import com.spicesshop.billing.service.ReportService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/reports"})
@CrossOrigin(origins = {"*"})
public class ReportController {

    @Autowired
    private ReportService reportService;

    @Autowired
    private GSTR1ExportService gstr1ExportService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping({"/daily"})
    public ResponseEntity<?> getDailyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.reportService.getDailyReport(date, companyName)
                .orElseGet(() -> this.reportService.generateDailyReport(date, companyName)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping({"/monthly"})
    public ResponseEntity<?> getMonthlyReport(
            @RequestParam Integer year, 
            @RequestParam Integer month, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.reportService.getMonthlyReport(year, month, companyName)
                .orElseGet(() -> this.reportService.generateMonthlyReport(year, month, companyName)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Month-wise sales for a year (12 entries). For boss report charts. */
    @GetMapping({"/monthly-by-year"})
    public ResponseEntity<?> getMonthlyByYear(
            @RequestParam Integer year,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            List<?> list = this.reportService.getMonthlySalesByYear(companyName, year);
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Top selling items for a month (by quantity). For boss report charts. */
    @GetMapping({"/top-selling-items"})
    public ResponseEntity<?> getTopSellingItems(
            @RequestParam Integer year,
            @RequestParam Integer month,
            @RequestParam(required = false, defaultValue = "15") Integer limit,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            return ResponseEntity.ok(this.reportService.getTopSellingItems(companyName, year, month, limit != null ? limit : 15));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GSTR-1 tax summary for the selected month (CGST, SGST, IGST, total tax) for display on Reports page.
     */
    @GetMapping({"/gstr1-summary"})
    public ResponseEntity<?> getGSTR1Summary(
            @RequestParam Integer year,
            @RequestParam Integer month,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            return ResponseEntity.ok(this.gstr1ExportService.getMonthlyTaxSummary(companyName, year, month));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GSTR-1 ready Excel export: 3 sheets – B2B_SALES, B2C_SUMMARY, MONTHLY_SUMMARY.
     * File name: GSTR1_Sales_Jan_2026.xlsx
     */
    @GetMapping({"/gstr1-export"})
    public ResponseEntity<?> getGSTR1Export(
            @RequestParam Integer year,
            @RequestParam Integer month,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            byte[] excel = this.gstr1ExportService.generateExcel(companyName, year, month);
            String fileName = this.gstr1ExportService.getFileName(year, month);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setContentLength(excel.length);
            return ResponseEntity.ok()
                .headers(headers)
                .body(excel);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
