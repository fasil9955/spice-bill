package com.spicesshop.billing.service;

import com.spicesshop.billing.model.AccountingDaySummary;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.repository.AccountingDaySummaryRepository;
import com.spicesshop.billing.repository.InvoiceRepository;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DailyCustomerNumbersMailService {

    private static final Logger log = LoggerFactory.getLogger(DailyCustomerNumbersMailService.class);

    @Autowired
    private InvoiceRepository invoiceRepository;

    @Autowired
    private AccountingDaySummaryRepository accountingDaySummaryRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${app.customer-numbers.to:fasilpvr52@gmail.com}")
    private String customerNumbersTo;

    /**
     * Emails today's retail customer phone numbers once per company/date when day-close is saved.
     */
    @Transactional
    public String sendOnDayCloseIfNeeded(String companyName, LocalDate date) {
        AccountingDaySummary summary = this.accountingDaySummaryRepository
            .findByCompanyNameAndReportDate(companyName, date)
            .orElse(null);
        if (summary != null && summary.getCustomerNumbersEmailedAt() != null) {
            return "already_sent";
        }
        if (this.mailSender == null || !StringUtils.hasText(this.mailUsername)) {
            return "mail_not_configured";
        }

        List<Invoice> invoices = this.invoiceRepository.findRetailWithCustomerPhoneByCompanyAndDate(companyName, date);
        if (invoices.isEmpty()) {
            return "none_collected";
        }

        StringBuilder body = new StringBuilder();
        body.append("Company: ").append(companyName).append("\n");
        body.append("Date: ").append(date.format(DateTimeFormatter.ISO_LOCAL_DATE)).append("\n");
        body.append("Customer numbers from retail bills: ").append(invoices.size()).append("\n\n");
        for (Invoice inv : invoices) {
            String name = inv.getCustomerName() != null && !inv.getCustomerName().isBlank()
                ? inv.getCustomerName().trim() : "–";
            body.append(inv.getInvoiceNumber())
                .append("  ")
                .append(name)
                .append("  ")
                .append(inv.getCustomerPhone().trim())
                .append("\n");
        }

        try {
            String from = StringUtils.hasText(this.mailFrom) ? this.mailFrom.trim() : this.mailUsername.trim();
            MimeMessage message = this.mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(this.customerNumbersTo.trim());
            helper.setSubject("Customer numbers – " + companyName + " – " + date);
            helper.setText(body.toString(), false);
            this.mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send customer numbers email for {} {}", companyName, date, e);
            return "failed";
        }

        if (summary == null) {
            summary = new AccountingDaySummary();
            summary.setCompanyName(companyName);
            summary.setReportDate(date);
            summary.setBillingBookSales(java.math.BigDecimal.ZERO);
        }
        summary.setCustomerNumbersEmailedAt(LocalDateTime.now());
        this.accountingDaySummaryRepository.save(summary);
        return "sent";
    }
}
