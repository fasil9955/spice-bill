package com.spicesshop.billing.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spicesshop.billing.model.DailySalesReport;
import com.spicesshop.billing.model.ExpenseRecord;
import com.spicesshop.billing.model.Product;
import com.spicesshop.billing.model.User;
import com.spicesshop.billing.repository.ExpenseRepository;
import com.spicesshop.billing.repository.ProductRepository;
import com.spicesshop.billing.repository.UserRepository;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
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

    private final ReportService reportService;
    private final ExpenseRepository expenseRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
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
        ObjectMapper objectMapper
    ) {
        this.reportService = reportService;
        this.expenseRepository = expenseRepository;
        this.productRepository = productRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Scheduled(initialDelay = 120_000, fixedDelay = 900_000)
    public void syncQuietly() {
        try {
            if (!enabled) {
                return;
            }
            if (hubUrl == null || hubUrl.isBlank() || shopId == null || shopId.isBlank() || token == null || token.isBlank()) {
                log.warn("boss.hub.enabled is true but url/shop-id/token is missing — skip");
                return;
            }
            List<String> companies = userRepository.findAll().stream()
                .map(User::getCompanyName)
                .filter(n -> n != null && !n.isBlank())
                .distinct()
                .collect(Collectors.toList());
            if (companies.isEmpty()) {
                return;
            }
            LocalDate today = LocalDate.now();
            for (String company : companies) {
                pushCompany(company, today);
            }
        } catch (Exception e) {
            log.warn("Boss hub sync skipped: {}", e.getMessage());
        }
    }

    private void pushCompany(String companyName, LocalDate date) {
        try {
            DailySalesReport daily = this.reportService.generateDailyReport(date, companyName);
            BigDecimal expenses = this.expenseRepository
                .findByCompanyNameAndExpenseDateOrderByCreatedAtDesc(companyName, date)
                .stream()
                .map(ExpenseRecord::getAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

            List<Map<String, Object>> lowStock = new ArrayList<>();
            List<Product> products = this.productRepository.findLowStockProductsByCompany(companyName);
            int n = 0;
            for (Product p : products) {
                if (n++ >= 40) {
                    break;
                }
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("name", p.getProductName());
                row.put("quantity", p.getQuantity());
                row.put("minStockLevel", p.getMinStockLevel());
                lowStock.add(row);
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
            body.put("cashSales", daily.getCashSales());
            body.put("cardSales", daily.getCardSales());
            body.put("upiSales", daily.getUpiSales());
            body.put("mixedSales", daily.getMixedSales());
            body.put("expenses", expenses);
            body.put("lowStock", lowStock);

            String json = objectMapper.writeValueAsString(body);
            String base = hubUrl.trim().replaceAll("/+$", "");
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(base + "/api/ingest"))
                .timeout(Duration.ofSeconds(8))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 300) {
                log.warn("Boss hub ingest HTTP {} for {}", res.statusCode(), companyName);
            }
        } catch (Exception e) {
            log.warn("Boss hub ingest failed for {}: {}", companyName, e.getMessage());
        }
    }
}
