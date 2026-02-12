package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.TopSellingItemDto;
import com.spicesshop.billing.model.DailySalesReport;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.model.InvoiceItem;
import com.spicesshop.billing.model.MonthlySalesSummary;
import com.spicesshop.billing.repository.DailySalesReportRepository;
import com.spicesshop.billing.repository.InvoiceRepository;
import com.spicesshop.billing.repository.MonthlySalesSummaryRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportService {

    @Autowired
    private DailySalesReportRepository dailySalesReportRepository;

    @Autowired
    private MonthlySalesSummaryRepository monthlySalesSummaryRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Transactional
    public DailySalesReport generateDailyReport(LocalDate date, String companyName) {
        List<Invoice> invoices = this.invoiceRepository.findByCompanyNameAndDate(companyName, date);

        DailySalesReport report = new DailySalesReport();
        report.setCompanyName(companyName);
        report.setReportDate(date);
        report.setTotalInvoices(invoices.size());

        BigDecimal totalSales = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        int totalItems = 0;
        BigDecimal cashSales = BigDecimal.ZERO;
        BigDecimal cardSales = BigDecimal.ZERO;
        BigDecimal upiSales = BigDecimal.ZERO;
        BigDecimal mixedSales = BigDecimal.ZERO;

        for (Invoice invoice : invoices) {
            totalSales = totalSales.add(invoice.getTotalAmount());
            totalTax = totalTax.add(invoice.getTaxAmount());
            totalDiscount = totalDiscount.add(invoice.getDiscountAmount());
            totalItems += invoice.getItems().size();

            if (invoice.getPaymentMethod() != null) {
                switch (invoice.getPaymentMethod()) {
                    case CASH -> cashSales = cashSales.add(invoice.getTotalAmount());
                    case CARD -> cardSales = cardSales.add(invoice.getTotalAmount());
                    case UPI -> upiSales = upiSales.add(invoice.getTotalAmount());
                    case MIXED -> mixedSales = mixedSales.add(invoice.getTotalAmount());
                }
            }
        }
        report.setTotalSales(totalSales);
        report.setTotalTax(totalTax);
        report.setTotalDiscount(totalDiscount);
        report.setTotalItemsSold(totalItems);
        report.setCashSales(cashSales);
        report.setCardSales(cardSales);
        report.setUpiSales(upiSales);
        report.setMixedSales(mixedSales);

        return this.dailySalesReportRepository.save(report);
    }

    public Optional<DailySalesReport> getDailyReport(LocalDate date, String companyName) {
        return this.dailySalesReportRepository.findByCompanyNameAndReportDate(companyName, date);
    }

    public List<DailySalesReport> getDailyReportsByDateRange(LocalDate startDate, LocalDate endDate, String companyName) {
        return this.dailySalesReportRepository.findByCompanyNameAndDateRange(companyName, startDate, endDate);
    }

    @Transactional
    public MonthlySalesSummary generateMonthlyReport(Integer year, Integer month, String companyName) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());

        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = endDate.atTime(23, 59, 59);

        List<Invoice> invoices = this.invoiceRepository.findByCompanyNameAndDateRange(companyName, startDateTime, endDateTime);

        MonthlySalesSummary summary = new MonthlySalesSummary();
        summary.setCompanyName(companyName);
        summary.setYear(year);
        summary.setMonth(month);
        summary.setTotalInvoices(invoices.size());

        BigDecimal totalSales = BigDecimal.ZERO;
        BigDecimal totalTax = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        int totalItems = 0;

        for (Invoice invoice : invoices) {
            totalSales = totalSales.add(invoice.getTotalAmount());
            totalTax = totalTax.add(invoice.getTaxAmount());
            totalDiscount = totalDiscount.add(invoice.getDiscountAmount());
            totalItems += invoice.getItems().size();
        }

        summary.setTotalSales(totalSales);
        summary.setTotalTax(totalTax);
        summary.setTotalDiscount(totalDiscount);
        summary.setTotalItemsSold(totalItems);

        return this.monthlySalesSummaryRepository.save(summary);
    }

    public Optional<MonthlySalesSummary> getMonthlyReport(Integer year, Integer month, String companyName) {
        return this.monthlySalesSummaryRepository.findByCompanyNameAndYearAndMonth(companyName, year, month);
    }

    public List<MonthlySalesSummary> getMonthlyReportsByYear(Integer year, String companyName) {
        return this.monthlySalesSummaryRepository.findByCompanyNameAndYear(companyName, year);
    }

    /**
     * Top selling items for a given month (by quantity). B2C only (excludes B2B). Company-wise.
     */
    public List<TopSellingItemDto> getTopSellingItems(String companyName, int year, int month, int limit) {
        LocalDate startDate = LocalDate.of(year, month, 1);
        LocalDateTime startDateTime = startDate.atStartOfDay();
        LocalDateTime endDateTime = startDate.withDayOfMonth(startDate.lengthOfMonth()).atTime(23, 59, 59);

        List<Invoice> invoices = this.invoiceRepository.findByCompanyNameAndDateRange(companyName, startDateTime, endDateTime);
        Map<Integer, AggItem> byProduct = new LinkedHashMap<>();

        for (Invoice inv : invoices) {
            if (inv.getStatus() != null && inv.getStatus() != Invoice.InvoiceStatus.ACTIVE) continue;
            if ("B2B".equals(inv.getInvoiceType())) continue;
            for (InvoiceItem ii : inv.getItems()) {
                Integer pid = ii.getProduct() != null ? ii.getProduct().getProductId() : null;
                String name = ii.getProductName() != null ? ii.getProductName() : "Unknown";
                String barcode = ii.getBarcode();
                BigDecimal qty = ii.getQuantity() != null ? ii.getQuantity() : BigDecimal.ZERO;
                BigDecimal rev = ii.getTotalPrice() != null ? ii.getTotalPrice() : BigDecimal.ZERO;

                int key = pid != null ? pid : (name.hashCode());
                byProduct.compute(key, (k, v) -> {
                    if (v == null) v = new AggItem(pid, name, barcode, BigDecimal.ZERO, BigDecimal.ZERO);
                    v.quantity = v.quantity.add(qty);
                    v.totalRevenue = v.totalRevenue.add(rev);
                    return v;
                });
            }
        }

        return byProduct.values().stream()
            .sorted((a, b) -> b.quantity.compareTo(a.quantity))
            .limit(limit > 0 ? limit : 20)
            .map(a -> new TopSellingItemDto(a.productId, a.productName, a.barcode, a.quantity, a.totalRevenue))
            .collect(Collectors.toList());
    }

    private static class AggItem {
        Integer productId;
        String productName;
        String barcode;
        BigDecimal quantity;
        BigDecimal totalRevenue;
        AggItem(Integer productId, String productName, String barcode, BigDecimal quantity, BigDecimal totalRevenue) {
            this.productId = productId;
            this.productName = productName;
            this.barcode = barcode;
            this.quantity = quantity;
            this.totalRevenue = totalRevenue;
        }
    }

    /**
     * Month-wise sales for a year. B2C only (excludes B2B). Company-wise. Returns 12 entries.
     */
    public List<MonthlySalesSummary> getMonthlySalesByYear(String companyName, int year) {
        LocalDateTime startDateTime = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime endDateTime = LocalDate.of(year, 12, 31).atTime(23, 59, 59);
        List<Invoice> invoices = this.invoiceRepository.findByCompanyNameAndDateRange(companyName, startDateTime, endDateTime);

        Map<Integer, MonthlySalesSummary> byMonth = new LinkedHashMap<>();
        for (int m = 1; m <= 12; m++) {
            MonthlySalesSummary summary = new MonthlySalesSummary();
            summary.setCompanyName(companyName);
            summary.setYear(year);
            summary.setMonth(m);
            summary.setTotalInvoices(0);
            summary.setTotalSales(BigDecimal.ZERO);
            summary.setTotalTax(BigDecimal.ZERO);
            summary.setTotalDiscount(BigDecimal.ZERO);
            summary.setTotalItemsSold(0);
            byMonth.put(m, summary);
        }

        for (Invoice inv : invoices) {
            if (inv.getStatus() != null && inv.getStatus() != Invoice.InvoiceStatus.ACTIVE) continue;
            if ("B2B".equals(inv.getInvoiceType())) continue;
            int m = inv.getCreatedAt() != null ? inv.getCreatedAt().getMonthValue() : 1;
            MonthlySalesSummary summary = byMonth.get(m);
            if (summary == null) continue;
            summary.setTotalInvoices((summary.getTotalInvoices() != null ? summary.getTotalInvoices() : 0) + 1);
            summary.setTotalSales(summary.getTotalSales().add(inv.getTotalAmount() != null ? inv.getTotalAmount() : BigDecimal.ZERO));
            summary.setTotalTax(summary.getTotalTax().add(inv.getTaxAmount() != null ? inv.getTaxAmount() : BigDecimal.ZERO));
            summary.setTotalDiscount(summary.getTotalDiscount().add(inv.getDiscountAmount() != null ? inv.getDiscountAmount() : BigDecimal.ZERO));
            summary.setTotalItemsSold((summary.getTotalItemsSold() != null ? summary.getTotalItemsSold() : 0) + (inv.getItems() != null ? inv.getItems().size() : 0));
        }

        return new ArrayList<>(byMonth.values());
    }
}
