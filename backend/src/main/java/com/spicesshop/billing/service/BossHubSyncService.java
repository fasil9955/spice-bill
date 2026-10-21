package com.spicesshop.billing.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.model.DailySalesReport;
import com.spicesshop.billing.model.Employee;
import com.spicesshop.billing.model.EmployeeSalaryClearance;
import com.spicesshop.billing.model.ExpenseRecord;
import com.spicesshop.billing.model.HubOutbox;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.model.Product;
import com.spicesshop.billing.model.User;
import com.spicesshop.billing.repository.AccountingDaySummaryRepository;
import com.spicesshop.billing.repository.EmployeeRepository;
import com.spicesshop.billing.repository.EmployeeSalaryClearanceRepository;
import com.spicesshop.billing.repository.ExpenseRepository;
import com.spicesshop.billing.repository.HubOutboxRepository;
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
    private final HubOutboxRepository hubOutboxRepository;
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
        HubOutboxRepository hubOutboxRepository,
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
        this.hubOutboxRepository = hubOutboxRepository;
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
            flushOutbox();
            for (String company : companyNames()) {
                pushCompany(company, LocalDate.now());
            }
        } catch (Exception e) {
            log.warn("Boss hub sync skipped: {}", e.getMessage());
        }
    }

    @Scheduled(initialDelay = 45_000, fixedDelay = 60_000)
    public void flushOutboxQuietly() {
        try {
            if (!isConfigured()) {
                return;
            }
            flushOutbox();
        } catch (Exception e) {
            log.warn("Boss hub outbox flush skipped: {}", e.getMessage());
        }
    }

    /** Day-close print: send now, or keep in queue until internet is back. Never throws. */
    public boolean pushDayClose(String companyName, LocalDate date) {
        if (!isConfigured()) {
            log.info("Boss hub not enabled — skip day-close send");
            return false;
        }
        return pushCompany(companyName, date);
    }

    public boolean isQueued(String companyName, LocalDate date) {
        return this.hubOutboxRepository.findByCompanyNameAndReportDate(companyName, date).isPresent();
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

            AccountingDaySummary summary = this.accountingDaySummaryRepository
                .findByCompanyNameAndReportDate(companyName, date)
                .orElse(null);
            AccountingDaySummary yesterday = this.accountingDaySummaryRepository
                .findByCompanyNameAndReportDate(companyName, date.minusDays(1))
                .orElse(null);

            BigDecimal systemSales = nz(daily.getTotalSales());
            BigDecimal billingBook = summary != null ? nz(summary.getBillingBookSales()) : BigDecimal.ZERO;
            BigDecimal totalSales = systemSales.add(billingBook);
            BigDecimal closingCash = summary != null ? nz(summary.getClosingCash()) : BigDecimal.ZERO;
            BigDecimal closingUpi = summary != null ? nz(summary.getClosingUpi()) : BigDecimal.ZERO;
            BigDecimal openingCash = yesterday != null ? nz(yesterday.getClosingCash()) : BigDecimal.ZERO;
            BigDecimal openingUpi = yesterday != null ? nz(yesterday.getClosingUpi()) : BigDecimal.ZERO;

            BigDecimal paymentCard = BigDecimal.ZERO;
            BigDecimal paymentUpi = BigDecimal.ZERO;
            List<Map<String, Object>> paymentLines = new ArrayList<>();
            if (summary != null && summary.getPaymentDetailsJson() != null && !summary.getPaymentDetailsJson().isBlank()) {
                try {
                    JsonNode pd = objectMapper.readTree(summary.getPaymentDetailsJson());
                    if (pd.has("cards") && pd.get("cards").isArray()) {
                        for (JsonNode c : pd.get("cards")) {
                            BigDecimal amt = jsonMoney(c.get("amount"));
                            paymentCard = paymentCard.add(amt);
                            Map<String, Object> line = new LinkedHashMap<>();
                            line.put("name", c.has("name") ? c.get("name").asText("Card") : "Card");
                            line.put("paymentMethod", "CARD");
                            line.put("amount", amt);
                            paymentLines.add(line);
                        }
                    }
                    if (pd.has("upis") && pd.get("upis").isArray()) {
                        for (JsonNode u : pd.get("upis")) {
                            BigDecimal amt = jsonMoney(u.get("amount"));
                            paymentUpi = paymentUpi.add(amt);
                            Map<String, Object> line = new LinkedHashMap<>();
                            line.put("name", u.has("name") ? u.get("name").asText("UPI") : "UPI");
                            line.put("paymentMethod", "UPI");
                            line.put("amount", amt);
                            paymentLines.add(line);
                        }
                    }
                } catch (Exception ignore) {
                    /* keep zeros */
                }
            }

            BigDecimal balanceResult = totalSales.add(openingCash).add(openingUpi)
                .subtract(expenseTotal)
                .subtract(paymentCard)
                .subtract(paymentUpi)
                .subtract(closingCash)
                .subtract(closingUpi);
            String balanceLabel = balanceResult.signum() < 0 ? "more" : (balanceResult.signum() > 0 ? "shortage" : "tally");

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
            body.put("totalSales", totalSales);
            body.put("systemSales", systemSales);
            body.put("billingBookSales", billingBook);
            body.put("totalTax", daily.getTotalTax());
            body.put("totalDiscount", daily.getTotalDiscount());
            body.put("totalItemsSold", daily.getTotalItemsSold());
            body.put("cashSales", cashIn);
            body.put("cardSales", cardIn);
            body.put("upiSales", upiIn);
            body.put("mixedSales", daily.getMixedSales());
            body.put("expenses", expenseTotal);
            body.put("paymentCard", paymentCard);
            body.put("paymentUpi", paymentUpi);
            body.put("paymentLines", paymentLines);
            body.put("openingCash", openingCash);
            body.put("openingUpi", openingUpi);
            body.put("closingCash", closingCash);
            body.put("closingUpi", closingUpi);
            body.put("balanceResult", balanceResult);
            body.put("balanceLabel", balanceLabel);
            body.put("leftoverTotal", BigDecimal.ZERO);
            body.put("leftoverCash", BigDecimal.ZERO);
            body.put("leftoverCard", BigDecimal.ZERO);
            body.put("leftoverUpi", BigDecimal.ZERO);
            body.put("expenseLines", expenseLines);
            body.put("employees", employees);
            body.put("lowStock", lowStock);

            String json = objectMapper.writeValueAsString(body);
            if (postIngest(json)) {
                this.hubOutboxRepository.findByCompanyNameAndReportDate(companyName, date)
                    .ifPresent(this.hubOutboxRepository::delete);
                return true;
            }
            enqueue(companyName, date, json, "ingest failed");
            return false;
        } catch (Exception e) {
            log.warn("Boss hub ingest failed for {}: {}", companyName, e.getMessage());
            return false;
        }
    }

    private void enqueue(String companyName, LocalDate date, String json, String error) {
        HubOutbox row = this.hubOutboxRepository
            .findByCompanyNameAndReportDate(companyName, date)
            .orElseGet(HubOutbox::new);
        row.setCompanyName(companyName);
        row.setReportDate(date);
        row.setPayloadJson(json);
        row.setLastError(error != null && error.length() > 500 ? error.substring(0, 500) : error);
        row.setLastAttemptAt(java.time.LocalDateTime.now());
        int prev = row.getAttempts() == null ? 0 : row.getAttempts();
        row.setAttempts(prev + 1);
        this.hubOutboxRepository.save(row);
        log.info("Boss hub queued day-close for {} {}", companyName, date);
    }

    private void flushOutbox() {
        for (HubOutbox row : this.hubOutboxRepository.findAllByOrderByCreatedAtAsc()) {
            try {
                if (postIngest(row.getPayloadJson())) {
                    this.hubOutboxRepository.delete(row);
                    log.info("Boss hub sent queued day-close for {} {}", row.getCompanyName(), row.getReportDate());
                } else {
                    row.setAttempts((row.getAttempts() == null ? 0 : row.getAttempts()) + 1);
                    row.setLastAttemptAt(java.time.LocalDateTime.now());
                    row.setLastError("ingest failed");
                    this.hubOutboxRepository.save(row);
                }
            } catch (Exception e) {
                row.setAttempts((row.getAttempts() == null ? 0 : row.getAttempts()) + 1);
                row.setLastAttemptAt(java.time.LocalDateTime.now());
                String msg = e.getMessage();
                row.setLastError(msg != null && msg.length() > 500 ? msg.substring(0, 500) : msg);
                this.hubOutboxRepository.save(row);
            }
        }
    }

    private boolean postIngest(String json) {
        try {
            String base = hubUrl.trim().replaceAll("/+$", "");
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base + "/api/ingest"))
                .timeout(Duration.ofSeconds(12))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                log.warn("Boss hub ingest HTTP {}", res.statusCode());
                return false;
            }
            return true;
        } catch (Exception e) {
            log.warn("Boss hub ingest offline: {}", e.getMessage());
            return false;
        }
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static BigDecimal jsonMoney(JsonNode n) {
        if (n == null || n.isNull()) {
            return BigDecimal.ZERO;
        }
        try {
            return new BigDecimal(n.asText("0"));
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
