package com.spicesshop.billing.service;

import com.spicesshop.billing.model.DailySalesReport;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.model.MonthlySalesSummary;
import com.spicesshop.billing.repository.DailySalesReportRepository;
import com.spicesshop.billing.repository.InvoiceRepository;
import com.spicesshop.billing.repository.MonthlySalesSummaryRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
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
}
