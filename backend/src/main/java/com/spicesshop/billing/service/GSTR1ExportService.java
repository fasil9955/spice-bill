package com.spicesshop.billing.service;

import com.spicesshop.billing.model.B2BCustomer;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.model.InvoiceItem;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * GSTR-1 ready Excel export: 3 sheets – B2B_SALES (Table 4), B2C_SUMMARY (Table 7), MONTHLY_SUMMARY.
 */
@Service
public class GSTR1ExportService {

    private static final Set<Integer> ALLOWED_GST_RATES = Set.of(5, 12, 18);
    private static final int GSTIN_LENGTH = 15;

    @Autowired
    private InvoiceService invoiceService;
    @Autowired
    private AuthService authService;

    /**
     * Generate Excel file for the given month. File name pattern: GSTR1_Sales_Jan_2026.xlsx
     */
    public byte[] generateExcel(String companyName, int year, int month) throws Exception {
        String sellerGstin = authService.getCompanyDetails(companyName).getGstNumber();
        String sellerStateCode = (sellerGstin != null && sellerGstin.length() >= 2)
            ? sellerGstin.substring(0, 2) : "";

        List<Invoice> allInvoices = invoiceService.getMonthlyInvoices(companyName, year, month);
        List<Invoice> b2bActive = allInvoices.stream()
            .filter(i -> "B2B".equals(i.getInvoiceType()) && i.getB2bCustomer() != null && i.getStatus() == Invoice.InvoiceStatus.ACTIVE)
            .toList();
        List<Invoice> b2bCancelled = allInvoices.stream()
            .filter(i -> "B2B".equals(i.getInvoiceType()) && (i.getStatus() == Invoice.InvoiceStatus.CANCELLED || i.getStatus() == Invoice.InvoiceStatus.CANCELLATION_REQUESTED))
            .toList();
        List<Invoice> b2cInvoices = allInvoices.stream()
            .filter(i -> !"B2B".equals(i.getInvoiceType()) && i.getStatus() == Invoice.InvoiceStatus.ACTIVE)
            .toList();

        // B2B rows: active (invoice-wise by GST rate) + cancelled (invoice number + blank fields + remarks "Cancelled")
        List<B2BRow> b2bRows = buildB2BRows(b2bActive, sellerStateCode);
        addCancelledB2BRows(b2bRows, b2bCancelled);

        // B2C rate-wise summary
        List<B2CSummaryRow> b2cRows = buildB2CSummary(b2cInvoices);

        // Monthly summary
        MonthlySummary summary = buildMonthlySummary(b2bRows, b2cRows);

        try (Workbook wb = new XSSFWorkbook()) {
            writeSheet1B2BSales(wb, b2bRows);
            writeSheet2B2CSummary(wb, b2cRows);
            writeSheet3MonthlySummary(wb, summary);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    public String getFileName(int year, int month) {
        String monthName = new String[]{"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"}[month - 1];
        return String.format("GSTR1_Sales_%s_%d.xlsx", monthName, year);
    }

    private static int gstRateFromItem(InvoiceItem item) {
        if (item.getGstPercentage() == null) return 0;
        int r = item.getGstPercentage().setScale(0, RoundingMode.HALF_UP).intValue();
        if (ALLOWED_GST_RATES.contains(r)) return r;
        if (r <= 6) return 5;
        if (r <= 15) return 12;
        return 18;
    }

    private static BigDecimal itemTaxable(InvoiceItem item) {
        BigDecimal total = item.getTotalPrice() != null ? item.getTotalPrice() : BigDecimal.ZERO;
        BigDecimal cgst = item.getCgstAmount() != null ? item.getCgstAmount() : BigDecimal.ZERO;
        BigDecimal sgst = item.getSgstAmount() != null ? item.getSgstAmount() : BigDecimal.ZERO;
        return total.subtract(cgst).subtract(sgst).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal itemTax(InvoiceItem item) {
        BigDecimal cgst = item.getCgstAmount() != null ? item.getCgstAmount() : BigDecimal.ZERO;
        BigDecimal sgst = item.getSgstAmount() != null ? item.getSgstAmount() : BigDecimal.ZERO;
        return cgst.add(sgst).setScale(2, RoundingMode.HALF_UP);
    }

    private List<B2BRow> buildB2BRows(List<Invoice> b2bInvoices, String sellerStateCode) {
        List<B2BRow> rows = new ArrayList<>();
        Set<String> seenInvoiceNos = new HashSet<>();

        for (Invoice inv : b2bInvoices) {
            B2BCustomer buyer = inv.getB2bCustomer();
            if (buyer == null) continue;

            String buyerGstin = buyer.getGstNumber() != null ? buyer.getGstNumber().trim() : "";
            if (buyerGstin.length() != GSTIN_LENGTH) continue; // validation: GSTIN must be 15 characters

            String buyerStateCode = (buyerGstin.length() >= 2) ? buyerGstin.substring(0, 2)
                : (buyer.getStateCode() != null ? buyer.getStateCode().trim() : "");
            if (buyerStateCode.length() != 2) continue;

            boolean sameState = buyerStateCode.equals(sellerStateCode);
            String invoiceNo = inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "";
            String invoiceDate = inv.getCreatedAt() != null
                ? inv.getCreatedAt().toLocalDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) : "";

            if (inv.getItems() == null || inv.getItems().isEmpty()) continue;

            // Group items by GST rate
            Map<Integer, List<InvoiceItem>> byRate = inv.getItems().stream()
                .filter(it -> gstRateFromItem(it) > 0)
                .collect(Collectors.groupingBy(GSTR1ExportService::gstRateFromItem));

            for (Map.Entry<Integer, List<InvoiceItem>> e : byRate.entrySet()) {
                int gstRate = e.getKey();
                List<InvoiceItem> items = e.getValue();
                BigDecimal taxableValue = items.stream().map(GSTR1ExportService::itemTaxable).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalTax = items.stream().map(GSTR1ExportService::itemTax).reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal cgstAmount = BigDecimal.ZERO;
                BigDecimal sgstAmount = BigDecimal.ZERO;
                BigDecimal igstAmount = BigDecimal.ZERO;
                if (sameState) {
                    cgstAmount = totalTax.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                    sgstAmount = totalTax.subtract(cgstAmount);
                } else {
                    igstAmount = totalTax;
                }

                BigDecimal invoiceTotal = taxableValue.add(totalTax).setScale(2, RoundingMode.HALF_UP);
                String rowKey = invoiceNo + "|" + gstRate;
                if (seenInvoiceNos.contains(rowKey)) continue; // invoice number + rate uniqueness
                seenInvoiceNos.add(rowKey);

                rows.add(new B2BRow(buyerGstin, buyerStateCode, invoiceNo, invoiceDate, gstRate, taxableValue,
                    cgstAmount, sgstAmount, igstAmount, invoiceTotal, sameState));
            }
        }
        return rows;
    }

    /** Add one row per cancelled B2B invoice: invoice number + all other fields blank, remarks "Cancelled". */
    private void addCancelledB2BRows(List<B2BRow> rows, List<Invoice> cancelledB2b) {
        BigDecimal zero = BigDecimal.ZERO;
        for (Invoice inv : cancelledB2b) {
            String invoiceNo = inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "";
            String invoiceDate = inv.getCreatedAt() != null
                ? inv.getCreatedAt().toLocalDate().format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) : "";
            rows.add(new B2BRow("", "", invoiceNo, invoiceDate, 0, zero, zero, zero, zero, zero, true, "Cancelled"));
        }
    }

    private List<B2CSummaryRow> buildB2CSummary(List<Invoice> b2cInvoices) {
        // Aggregate by GST rate: taxable_value, then cgst = taxable * rate/2, sgst = same
        Map<Integer, BigDecimal> taxableByRate = new HashMap<>();
        for (Invoice inv : b2cInvoices) {
            if (inv.getItems() == null) continue;
            for (InvoiceItem item : inv.getItems()) {
                int rate = gstRateFromItem(item);
                if (rate == 0) continue;
                BigDecimal taxable = itemTaxable(item);
                taxableByRate.merge(rate, taxable, BigDecimal::add);
            }
        }
        List<B2CSummaryRow> rows = new ArrayList<>();
        for (int rate : new TreeSet<>(taxableByRate.keySet())) {
            BigDecimal taxable = taxableByRate.get(rate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal halfRate = BigDecimal.valueOf(rate).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP).divide(BigDecimal.valueOf(2), 4, RoundingMode.HALF_UP);
            BigDecimal cgst = taxable.multiply(halfRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal sgst = taxable.multiply(halfRate).setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalTax = cgst.add(sgst).setScale(2, RoundingMode.HALF_UP);
            rows.add(new B2CSummaryRow(rate, taxable, cgst, sgst, totalTax));
        }
        return rows;
    }

    private MonthlySummary buildMonthlySummary(List<B2BRow> b2bRows, List<B2CSummaryRow> b2cRows) {
        BigDecimal b2bSameTaxable = b2bRows.stream().filter(r -> r.sameState).map(r -> r.taxableValue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2bSameCgst = b2bRows.stream().filter(r -> r.sameState).map(r -> r.cgstAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2bSameSgst = b2bRows.stream().filter(r -> r.sameState).map(r -> r.sgstAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2bSameIgst = BigDecimal.ZERO;

        BigDecimal b2bOtherTaxable = b2bRows.stream().filter(r -> !r.sameState).map(r -> r.taxableValue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2bOtherIgst = b2bRows.stream().filter(r -> !r.sameState).map(r -> r.igstAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2bOtherCgst = BigDecimal.ZERO;
        BigDecimal b2bOtherSgst = BigDecimal.ZERO;

        BigDecimal b2cTaxable = b2cRows.stream().map(r -> r.taxableValue).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2cCgst = b2cRows.stream().map(r -> r.cgstAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2cSgst = b2cRows.stream().map(r -> r.sgstAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal b2cIgst = BigDecimal.ZERO;

        BigDecimal totalTaxable = b2bSameTaxable.add(b2bOtherTaxable).add(b2cTaxable);
        BigDecimal totalCgst = b2bSameCgst.add(b2bOtherCgst).add(b2cCgst);
        BigDecimal totalSgst = b2bSameSgst.add(b2bOtherSgst).add(b2cSgst);
        BigDecimal totalIgst = b2bSameIgst.add(b2bOtherIgst).add(b2cIgst);
        BigDecimal totalTax = totalCgst.add(totalSgst).add(totalIgst);

        return new MonthlySummary(
            b2bSameTaxable, b2bSameCgst, b2bSameSgst, b2bSameIgst,
            b2bOtherTaxable, b2bOtherCgst, b2bOtherSgst, b2bOtherIgst,
            b2cTaxable, b2cCgst, b2cSgst, b2cIgst,
            totalTaxable, totalCgst, totalSgst, totalIgst, totalTax
        );
    }

    private void writeSheet1B2BSales(Workbook wb, List<B2BRow> rows) {
        Sheet sheet = wb.createSheet("B2B_SALES");
        String[] headers = {"buyer_gstin", "buyer_state_code", "invoice_no", "invoice_date", "gst_rate", "taxable_value", "cgst_amount", "sgst_amount", "igst_amount", "invoice_total", "remarks"};
        Row headerRow = sheet.createRow(0);
        CellStyle headerStyle = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        headerStyle.setFont(font);
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        int rowNum = 1;
        for (B2BRow r : rows) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(r.buyerGstin);
            row.createCell(1).setCellValue(r.buyerStateCode);
            row.createCell(2).setCellValue(r.invoiceNo);
            row.createCell(3).setCellValue(r.invoiceDate);
            row.createCell(4).setCellValue(r.gstRate);
            row.createCell(5).setCellValue(r.taxableValue.doubleValue());
            row.createCell(6).setCellValue(r.cgstAmount.doubleValue());
            row.createCell(7).setCellValue(r.sgstAmount.doubleValue());
            row.createCell(8).setCellValue(r.igstAmount.doubleValue());
            row.createCell(9).setCellValue(r.invoiceTotal.doubleValue());
            row.createCell(10).setCellValue(r.remarks != null ? r.remarks : "");
        }
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void writeSheet2B2CSummary(Workbook wb, List<B2CSummaryRow> rows) {
        Sheet sheet = wb.createSheet("B2C_SUMMARY");
        String[] headers = {"gst_rate", "taxable_value", "cgst_amount", "sgst_amount", "total_tax"};
        Row headerRow = sheet.createRow(0);
        CellStyle headerStyle = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        headerStyle.setFont(font);
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        int rowNum = 1;
        for (B2CSummaryRow r : rows) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(r.gstRate);
            row.createCell(1).setCellValue(r.taxableValue.doubleValue());
            row.createCell(2).setCellValue(r.cgstAmount.doubleValue());
            row.createCell(3).setCellValue(r.sgstAmount.doubleValue());
            row.createCell(4).setCellValue(r.totalTax.doubleValue());
        }
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void writeSheet3MonthlySummary(Workbook wb, MonthlySummary s) {
        Sheet sheet = wb.createSheet("MONTHLY_SUMMARY");
        String[] headers = {"sale_type", "taxable_value", "cgst", "sgst", "igst", "total_tax"};
        Row headerRow = sheet.createRow(0);
        CellStyle headerStyle = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        headerStyle.setFont(font);
        for (int i = 0; i < headers.length; i++) {
            Cell c = headerRow.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        int rowNum = 1;
        writeSummaryRow(sheet, rowNum++, "B2B – Same State", s.b2bSameTaxable, s.b2bSameCgst, s.b2bSameSgst, s.b2bSameIgst);
        writeSummaryRow(sheet, rowNum++, "B2B – Other State", s.b2bOtherTaxable, s.b2bOtherCgst, s.b2bOtherSgst, s.b2bOtherIgst);
        writeSummaryRow(sheet, rowNum++, "B2C – Local", s.b2cTaxable, s.b2cCgst, s.b2cSgst, s.b2cIgst);
        writeSummaryRow(sheet, rowNum++, "TOTAL", s.totalTaxable, s.totalCgst, s.totalSgst, s.totalIgst);
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private void writeSummaryRow(Sheet sheet, int rowNum, String saleType, BigDecimal taxable, BigDecimal cgst, BigDecimal sgst, BigDecimal igst) {
        Row row = sheet.createRow(rowNum);
        row.createCell(0).setCellValue(saleType);
        row.createCell(1).setCellValue(taxable.doubleValue());
        row.createCell(2).setCellValue(cgst.doubleValue());
        row.createCell(3).setCellValue(sgst.doubleValue());
        row.createCell(4).setCellValue(igst.doubleValue());
        row.createCell(5).setCellValue(cgst.add(sgst).add(igst).doubleValue());
    }

    private static class B2BRow {
        final String buyerGstin;
        final String buyerStateCode;
        final String invoiceNo;
        final String invoiceDate;
        final int gstRate;
        final BigDecimal taxableValue;
        final BigDecimal cgstAmount;
        final BigDecimal sgstAmount;
        final BigDecimal igstAmount;
        final BigDecimal invoiceTotal;
        final boolean sameState;
        final String remarks;

        B2BRow(String buyerGstin, String buyerStateCode, String invoiceNo, String invoiceDate, int gstRate,
               BigDecimal taxableValue, BigDecimal cgstAmount, BigDecimal sgstAmount, BigDecimal igstAmount,
               BigDecimal invoiceTotal, boolean sameState) {
            this(buyerGstin, buyerStateCode, invoiceNo, invoiceDate, gstRate, taxableValue, cgstAmount, sgstAmount, igstAmount, invoiceTotal, sameState, "");
        }

        B2BRow(String buyerGstin, String buyerStateCode, String invoiceNo, String invoiceDate, int gstRate,
               BigDecimal taxableValue, BigDecimal cgstAmount, BigDecimal sgstAmount, BigDecimal igstAmount,
               BigDecimal invoiceTotal, boolean sameState, String remarks) {
            this.buyerGstin = buyerGstin;
            this.buyerStateCode = buyerStateCode;
            this.invoiceNo = invoiceNo;
            this.invoiceDate = invoiceDate;
            this.gstRate = gstRate;
            this.taxableValue = taxableValue;
            this.cgstAmount = cgstAmount;
            this.sgstAmount = sgstAmount;
            this.igstAmount = igstAmount;
            this.invoiceTotal = invoiceTotal;
            this.sameState = sameState;
            this.remarks = remarks != null ? remarks : "";
        }
    }

    private static class B2CSummaryRow {
        final int gstRate;
        final BigDecimal taxableValue;
        final BigDecimal cgstAmount;
        final BigDecimal sgstAmount;
        final BigDecimal totalTax;

        B2CSummaryRow(int gstRate, BigDecimal taxableValue, BigDecimal cgstAmount, BigDecimal sgstAmount, BigDecimal totalTax) {
            this.gstRate = gstRate;
            this.taxableValue = taxableValue;
            this.cgstAmount = cgstAmount;
            this.sgstAmount = sgstAmount;
            this.totalTax = totalTax;
        }
    }

    private static class MonthlySummary {
        final BigDecimal b2bSameTaxable, b2bSameCgst, b2bSameSgst, b2bSameIgst;
        final BigDecimal b2bOtherTaxable, b2bOtherCgst, b2bOtherSgst, b2bOtherIgst;
        final BigDecimal b2cTaxable, b2cCgst, b2cSgst, b2cIgst;
        final BigDecimal totalTaxable, totalCgst, totalSgst, totalIgst, totalTax;

        MonthlySummary(BigDecimal b2bSameTaxable, BigDecimal b2bSameCgst, BigDecimal b2bSameSgst, BigDecimal b2bSameIgst,
                      BigDecimal b2bOtherTaxable, BigDecimal b2bOtherCgst, BigDecimal b2bOtherSgst, BigDecimal b2bOtherIgst,
                      BigDecimal b2cTaxable, BigDecimal b2cCgst, BigDecimal b2cSgst, BigDecimal b2cIgst,
                      BigDecimal totalTaxable, BigDecimal totalCgst, BigDecimal totalSgst, BigDecimal totalIgst, BigDecimal totalTax) {
            this.b2bSameTaxable = b2bSameTaxable;
            this.b2bSameCgst = b2bSameCgst;
            this.b2bSameSgst = b2bSameSgst;
            this.b2bSameIgst = b2bSameIgst;
            this.b2bOtherTaxable = b2bOtherTaxable;
            this.b2bOtherCgst = b2bOtherCgst;
            this.b2bOtherSgst = b2bOtherSgst;
            this.b2bOtherIgst = b2bOtherIgst;
            this.b2cTaxable = b2cTaxable;
            this.b2cCgst = b2cCgst;
            this.b2cSgst = b2cSgst;
            this.b2cIgst = b2cIgst;
            this.totalTaxable = totalTaxable;
            this.totalCgst = totalCgst;
            this.totalSgst = totalSgst;
            this.totalIgst = totalIgst;
            this.totalTax = totalTax;
        }
    }
}
