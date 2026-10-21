package com.spicesshop.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.model.DailySalesReport;
import com.spicesshop.billing.model.Employee;
import com.spicesshop.billing.model.EmployeeSalaryClearance;
import com.spicesshop.billing.model.ExpenseRecord;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.model.Product;
import com.spicesshop.billing.model.User;
import com.spicesshop.billing.repository.AccountingDaySummaryRepository;
import com.spicesshop.billing.repository.EmployeeRepository;
import com.spicesshop.billing.repository.EmployeeSalaryClearanceRepository;
import com.spicesshop.billing.repository.ExpenseRepository;
import com.spicesshop.billing.repository.InvoiceRepository;
import com.spicesshop.billing.repository.ProductRepository;
import com.spicesshop.billing.repository.UserRepository;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Pushes daily totals to the VPS boss hub. Failures are logged only — never thrown into billing.
 */
@Service
public class BossHubSyncService {

    private static final Logger log = LoggerFactory.getLogger(BossHubSyncService.class);
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("yyyy-MM");

    private final ReportService reportService;
    private final ExpenseRepository expenseRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final InvoiceRepository invoiceRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeSalaryClearanceRepository salaryClearanceRepository;
    private final AccountingDaySummaryRepository accountingDaySummaryRepository;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(4))
        .build();

    @Value("${boss.hub.enabled:false}")
    private boolean enabled;

    @Value("${boss.hub.url:}")
    private String hubUrl;

    @Value("${boss.hub.shop-id:}")
    private String shopId;

    @Value("${boss.hub.token:}")
    private String token;

    public BossHubSyncService(
        ReportService reportService,
        ExpenseRepository expenseRepository,
        ProductRepository productRepository,
        UserRepository userRepository,
        InvoiceRepository invoiceRepository,
        EmployeeRepository employeeRepository,
        EmployeeSalaryClearanceRepository salaryClearanceRepository,
        AccountingDaySummaryRepository accountingDaySummaryRepository,
        ObjectMapper objectMapper
    ) {
        this.reportService = reportService;
        this.expenseRepository = expenseRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.invoiceRepository = invoiceRepository;
        this.employeeRepository = employeeRepository;
        this.salaryClearanceRepository = salaryClearanceRepository;
        this.accountingDaySummaryRepository = accountingDaySummaryRepository;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return enabled
            && hubUrl != null && !hubUrl.isBlank()
            && shopId != null && !shopId.isBlank()
            && token != null && !token.isBlank();
    }

    @Scheduled(initialDelay = 120_000, fixedDelay = 900_000)
    public void syncQuietly() {
        try {
            if (!isConfigured()) {
                return;
            }
            for (String company : companyNames()) {
                pushCompany(company, LocalDate.now());
            }
        } catch (Exception e) {
            log.warn("Boss hub sync skipped: {}", e.getMessage());
        }
    }

    /** Day-close print: send this date now. Never throws. */
    public boolean pushDayClose(String companyName, LocalDate date) {
        if (!isConfigured()) {
            log.info("Boss hub not enabled — skip day-close send");
            return false;
        }
        return pushCompany(companyName, date);
    }

    private List<String> companyNames() {
        return userRepository.findAll().stream()
            .map(User::getCompanyName)
            .filter(n -> n != null && !n.isBlank())
            .distinct()
            .collect(Collectors.toList());
    }

    private boolean pushCompany(String companyName, LocalDate date) {
        try {
            DailySalesReport daily = this.reportService.generateDailyReport(date, companyName);
            List<ExpenseRecord> expenseRows = this.expenseRepository
                .findByCompanyNameAndExpenseDateOrderByCreatedAtDesc(companyName, date);

            BigDecimal expenseTotal = BigDecimal.ZERO;
            BigDecimal expCash = BigDecimal.ZERO;
            BigDecimal expCard = BigDecimal.ZERO;
            BigDecimal expUpi = BigDecimal.ZERO;
            List<Map<String, Object>> expenseLines = new ArrayList<>();
            for (ExpenseRecord e : expenseRows) {
                BigDecimal amt = nz(e.getAmount());
                expenseTotal = expenseTotal.add(amt);
                String pm = e.getPaymentMethod() != null ? e.getPaymentMethod().toUpperCase() : "CASH";
                if ("CARD".equals(pm)) {
                    expCard = expCard.add(amt);
                } else if ("UPI".equals(pm)) {
                    expUpi = expUpi.add(amt);
                } else {
                    expCash = expCash.add(amt);
                }
                String name = "EMPLOYEE".equalsIgnoreCase(e.getAccountType())
                    ? ("Employee #" + (e.getEmployeeId() != null ? e.getEmployeeId() : ""))
                    : (e.getOtherName() != null ? e.getOtherName() : "Expense");
                if ("EMPLOYEE".equalsIgnoreCase(e.getAccountType()) && e.getEmployeeId() != null) {
                    name = this.employeeRepository.findById(e.getEmployeeId())
                        .map(Employee::getEmployeeName)
                        .orElse(name);
                }
                Map<String, Object> line = new LinkedHashMap<>();
                line.put("name", name);
                line.put("amount", amt);
                line.put("paymentMethod", pm);
                line.put("accountType", e.getAccountType());
                expenseLines.add(line);
            }

            BigDecimal cashIn = BigDecimal.ZERO;
            BigDecimal cardIn = BigDecimal.ZERO;
            BigDecimal upiIn = BigDecimal.ZERO;
            List<Invoice> invoices = this.invoiceRepository.findByCompanyNameAndDateRange(
                companyName, date.atStartOfDay(), date.plusDays(1).atStartOfDay().minusNanos(1));
            for (Invoice inv : invoices) {
                if (inv.getStatus() != null && inv.getStatus() != Invoice.InvoiceStatus.ACTIVE) {
                    continue;
                }
                if (Invoice.isB2bFamily(inv.getInvoiceType())) {
                    continue;
                }
                cashIn = cashIn.add(nz(inv.getCashAmount()));
                cardIn = cardIn.add(nz(inv.getCardAmount()));
                upiIn = upiIn.add(nz(inv.getUpiAmount()));
            }

            BigDecimal leftoverCash = cashIn.subtract(expCash);
            BigDecimal leftoverCard = cardIn.subtract(expCard);
            BigDecimal leftoverUpi = upiIn.subtract(expUpi);
            BigDecimal leftoverTotal = nz(daily.getTotalSales()).subtract(expenseTotal);

            BigDecimal closingCash = this.accountingDaySummaryRepository
                .findByCompanyNameAndReportDate(companyName, date)
                .map(AccountingDaySummary::getClosingCash)
                .orElse(BigDecimal.ZERO);

            List<Map<String, Object>> lowStock = new ArrayList<>();
            int n = 0;
            for (Product p : this.productRepository.findLowStockProductsByCompany(companyName)) {
                if (n++ >= 40) {
                    break;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("name", p.getProductName());
                row.put("quantity", p.getQuantity());
                row.put("minStockLevel", p.getMinStockLevel());
                lowStock.add(row);
            }

            String salaryMonth = date.format(MONTH);
            Map<Integer, EmployeeSalaryClearance> byEmp = new HashMap<>();
            for (EmployeeSalaryClearance c : this.salaryClearanceRepository
                .findByCompanyNameAndSalaryMonth(companyName, salaryMonth)) {
                byEmp.put(c.getEmployeeId(), c);
            }
            List<Map<String, Object>> employees = new ArrayList<>();
            for (Employee emp : this.employeeRepository.findByCompanyNameAndIsActive(companyName, true)) {
                EmployeeSalaryClearance c = byEmp.get(emp.getEmployeeId());
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("name", emp.getEmployeeName());
                row.put("code", emp.getEmployeeCode());
                row.put("phone", emp.getPhone() != null ? emp.getPhone() : "");
                row.put("designation", emp.getDesignation() != null ? emp.getDesignation() : "");
                row.put("salaryMonth", salaryMonth);
                row.put("salary", c != null ? nz(c.getSalaryAmount()) : BigDecimal.ZERO);
                row.put("taken", c != null ? nz(c.getTotalTaken()) : BigDecimal.ZERO);
                row.put("netPay", c != null ? nz(c.getNetPay()) : BigDecimal.ZERO);
                row.put("closingBalance", c != null ? nz(c.getClosingBalance()) : BigDecimal.ZERO);
                employees.add(row);
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("shopId", shopId.trim());
            body.put("token", token.trim());
            body.put("companyName", companyName);
            body.put("date", date.toString());
            body.put("totalInvoices", daily.getTotalInvoices());
            body.put("totalSales", daily.getTotalSales());
            body.put("totalTax", daily.getTotalTax());
            body.put("totalDiscount", daily.getTotalDiscount());
            body.put("totalItemsSold", daily.getTotalItemsSold());
            body.put("cashSales", cashIn);
            body.put("cardSales", cardIn);
            body.put("upiSales", upiIn);
            body.put("mixedSales", daily.getMixedSales());
            body.put("expenses", expenseTotal);
            body.put("leftoverTotal", leftoverTotal);
            body.put("leftoverCash", leftoverCash);
            body.put("leftoverCard", leftoverCard);
            body.put("leftoverUpi", leftoverUpi);
            body.put("closingCash", nz(closingCash));
            body.put("expenseLines", expenseLines);
            body.put("employees", employees);
            body.put("lowStock", lowStock);

            String json = objectMapper.writeValueAsString(body);
            String base = hubUrl.trim().replaceAll("/+$", "");
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base + "/api/ingest"))
                .timeout(Duration.ofSeconds(12))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                log.warn("Boss hub ingest HTTP {} for {}", res.statusCode(), companyName);
                return false;
            }
            return true;
        } catch (Exception e) {
            log.warn("Boss hub ingest failed for {}: {}", companyName, e.getMessage());
            return false;
        }
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
