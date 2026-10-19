package com.spicesshop.billing.controller;

import com.spicesshop.billing.service.GSTR1ExportService;
import com.spicesshop.billing.service.MonthlySalesExcelService;
import com.spicesshop.billing.service.ReportService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
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
    private MonthlySalesExcelService monthlySalesExcelService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping({"/daily"})
    public ResponseEntity<?> getDailyReport(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date, 
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.reportService.generateDailyReport(date, companyName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Selected product quantities for one day (Boss Report). */
    @GetMapping({"/daily-product-sales"})
    public ResponseEntity<?> getDailyProductSales(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) String productIds,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            List<Integer> ids = new java.util.ArrayList<>();
            if (productIds != null && !productIds.isBlank()) {
                for (String part : productIds.split(",")) {
                    try {
                        ids.add(Integer.parseInt(part.trim()));
                    } catch (NumberFormatException ignored) {
                        /* skip */
                    }
                }
            }
            return ResponseEntity.ok(this.reportService.getDailyProductSales(companyName, date, ids));
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
            return ResponseEntity.ok(this.reportService.generateMonthlyReport(year, month, companyName));
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
            return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(this.gstr1ExportService.getMonthlyTaxSummary(companyName, year, month));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Manual B2C 5% / 18% taxable split for the selected month (GSTR-1 Table 7). */
    @PostMapping({"/b2c-gst-split"})
    public ResponseEntity<?> saveB2cGstSplit(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            Integer year = body.get("year") instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(body.get("year")));
            Integer month = body.get("month") instanceof Number n ? n.intValue() : Integer.parseInt(String.valueOf(body.get("month")));
            BigDecimal taxable5 = toDecimal(body.get("taxable5"));
            BigDecimal taxable18 = toDecimal(body.get("taxable18"));
            return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .body(this.gstr1ExportService.saveB2cGstSplit(companyName, year, month, taxable5, taxable18));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private static BigDecimal toDecimal(Object v) {
        if (v == null || String.valueOf(v).isBlank()) {
            return BigDecimal.ZERO;
        }
        return new BigDecimal(String.valueOf(v).trim());
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
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(excel);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Bill-wise list for the month (B2C + B2B) for on-screen print. */
    @GetMapping({"/monthly-sales"})
    public ResponseEntity<?> getMonthlySales(
            @RequestParam Integer year,
            @RequestParam Integer month,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .body(this.monthlySalesExcelService.getMonthlySales(companyName, year, month));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Excel of every bill in the month: ALL_BILLS, B2C_BILLS, B2B_BILLS, TOTALS. */
    @GetMapping({"/monthly-sales-export"})
    public ResponseEntity<?> getMonthlySalesExport(
            @RequestParam Integer year,
            @RequestParam Integer month,
            @RequestParam(required = false, defaultValue = "all") String kind,
            HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            byte[] excel = this.monthlySalesExcelService.generateExcel(companyName, year, month, kind);
            String fileName = this.monthlySalesExcelService.getFileName(year, month, kind);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setContentLength(excel.length);
            return ResponseEntity.ok()
                .headers(headers)
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .body(excel);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
