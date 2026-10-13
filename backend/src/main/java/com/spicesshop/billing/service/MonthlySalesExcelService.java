package com.spicesshop.billing.service;

import com.spicesshop.billing.model.B2BCustomer;
import com.spicesshop.billing.model.Invoice;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/** Monthly Excel of every bill (B2C + B2B) for shop records / officer backup. */
@Service
public class MonthlySalesExcelService {

    private static final String[] MONTH_NAMES = {
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy");
    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("hh:mm a", Locale.ENGLISH);
    private static final String[] BILL_HEADERS = {
        "Date", "Time", "Invoice No", "Type", "Customer", "Phone", "GSTIN",
        "Taxable", "Discount", "CGST", "SGST", "Total", "Payment", "Status"
    };

    @Autowired
    private InvoiceService invoiceService;

    public String getFileName(int year, int month) {
        return String.format("Monthly_Sales_%s_%d.xlsx", MONTH_NAMES[month - 1], year);
    }

    public Map<String, Object> getMonthlySales(String companyName, int year, int month) {
        List<Invoice> invoices = loadSorted(companyName, year, month);
        List<Map<String, Object>> all = new ArrayList<>();
        List<Map<String, Object>> b2c = new ArrayList<>();
        List<Map<String, Object>> b2b = new ArrayList<>();
        for (Invoice inv : invoices) {
            Map<String, Object> row = toRow(inv);
            all.add(row);
            if (Invoice.isB2bFamily(inv.getInvoiceType())) {
                b2b.add(row);
            } else {
                b2c.add(row);
            }
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("year", year);
        out.put("month", month);
        out.put("monthName", MONTH_NAMES[month - 1]);
        out.put("bills", all);
        out.put("b2c", b2c);
        out.put("b2b", b2b);
        out.put("totals", totals(all));
        out.put("b2cTotals", totals(b2c));
        out.put("b2bTotals", totals(b2b));
        return out;
    }

    public byte[] generateExcel(String companyName, int year, int month) throws Exception {
        Map<String, Object> data = getMonthlySales(companyName, year, month);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> all = (List<Map<String, Object>>) data.get("bills");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> b2c = (List<Map<String, Object>>) data.get("b2c");
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> b2b = (List<Map<String, Object>>) data.get("b2b");

        try (Workbook wb = new XSSFWorkbook()) {
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            headerStyle.setFont(font);
            CellStyle moneyStyle = wb.createCellStyle();
            moneyStyle.setDataFormat(wb.createDataFormat().getFormat("#,##0.00"));

            writeBillsSheet(wb, "ALL_BILLS", all, headerStyle, moneyStyle);
            writeBillsSheet(wb, "B2C_BILLS", b2c, headerStyle, moneyStyle);
            writeBillsSheet(wb, "B2B_BILLS", b2b, headerStyle, moneyStyle);
            writeTotalsSheet(wb, data, headerStyle, moneyStyle);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            wb.write(out);
            return out.toByteArray();
        }
    }

    private List<Invoice> loadSorted(String companyName, int year, int month) {
        List<Invoice> invoices = new ArrayList<>(invoiceService.getMonthlyInvoices(companyName, year, month));
        invoices.sort(Comparator
            .comparing(Invoice::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(Invoice::getInvoiceNumber, Comparator.nullsLast(String::compareTo)));
        return invoices;
    }

    private static Map<String, Object> toRow(Invoice inv) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("date", inv.getCreatedAt() != null ? inv.getCreatedAt().toLocalDate().format(DATE_FMT) : "");
        row.put("time", inv.getCreatedAt() != null ? inv.getCreatedAt().toLocalTime().format(TIME_FMT) : "");
        row.put("invoiceNo", inv.getInvoiceNumber() != null ? inv.getInvoiceNumber() : "");
        row.put("type", typeLabel(inv.getInvoiceType()));
        row.put("customer", customerName(inv));
        row.put("phone", customerPhone(inv));
        row.put("gstin", buyerGstin(inv));
        row.put("taxable", money(inv.getSubtotal()));
        row.put("discount", money(inv.getDiscountAmount()));
        row.put("cgst", money(inv.getCgstAmount()));
        row.put("sgst", money(inv.getSgstAmount()));
        row.put("total", money(inv.getTotalAmount()));
        row.put("payment", paymentLabel(inv));
        row.put("status", inv.getStatus() != null ? inv.getStatus().name() : "");
        row.put("active", inv.getStatus() == Invoice.InvoiceStatus.ACTIVE);
        return row;
    }

    private static String typeLabel(String type) {
        if (type == null || type.isBlank() || "RETAIL".equals(type)) {
            return "B2C";
        }
        if ("CREDIT_NOTE".equals(type)) {
            return "Credit Note";
        }
        if ("DEBIT_NOTE".equals(type)) {
            return "Debit Note";
        }
        return type;
    }

    private static String customerName(Invoice inv) {
        if (inv.getCustomerName() != null && !inv.getCustomerName().isBlank()) {
            return inv.getCustomerName().trim();
        }
        B2BCustomer c = inv.getB2bCustomer();
        if (c != null && c.getCustomerName() != null) {
            return c.getCustomerName().trim();
        }
        return "";
    }

    private static String customerPhone(Invoice inv) {
        if (inv.getCustomerPhone() != null && !inv.getCustomerPhone().isBlank()) {
            return inv.getCustomerPhone().trim();
        }
        B2BCustomer c = inv.getB2bCustomer();
        if (c != null && c.getPhone() != null) {
            return c.getPhone().trim();
        }
        return "";
    }

    private static String buyerGstin(Invoice inv) {
        B2BCustomer c = inv.getB2bCustomer();
        if (c != null && c.getGstNumber() != null) {
            return c.getGstNumber().trim();
        }
        return "";
    }

    private static String paymentLabel(Invoice inv) {
        Invoice.PaymentMethod method = inv.getPaymentMethod();
        if (method == null) {
            return "";
        }
        if (method == Invoice.PaymentMethod.CASH) {
            return "Cash";
        }
        if (method == Invoice.PaymentMethod.CARD) {
            return "Card";
        }
        if (method == Invoice.PaymentMethod.UPI) {
            String acc = inv.getUpiAccount();
            if (acc != null && !acc.isBlank() && !acc.trim().startsWith("[")) {
                return acc.trim();
            }
            return "UPI";
        }
        List<String> parts = new ArrayList<>();
        if (nz(inv.getCashAmount()).compareTo(BigDecimal.ZERO) > 0) {
            parts.add("Cash " + money(inv.getCashAmount()));
        }
        if (nz(inv.getCardAmount()).compareTo(BigDecimal.ZERO) > 0) {
            parts.add("Card " + money(inv.getCardAmount()));
        }
        if (nz(inv.getUpiAmount()).compareTo(BigDecimal.ZERO) > 0) {
            parts.add("UPI " + money(inv.getUpiAmount()));
        }
        return parts.isEmpty() ? "Mixed" : String.join(" + ", parts);
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> totals(List<Map<String, Object>> rows) {
        BigDecimal taxable = BigDecimal.ZERO;
        BigDecimal discount = BigDecimal.ZERO;
        BigDecimal cgst = BigDecimal.ZERO;
        BigDecimal sgst = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;
        int activeCount = 0;
        for (Map<String, Object> row : rows) {
            if (!Boolean.TRUE.equals(row.get("active"))) {
                continue;
            }
            activeCount++;
            taxable = taxable.add(asMoney(row.get("taxable")));
            discount = discount.add(asMoney(row.get("discount")));
            cgst = cgst.add(asMoney(row.get("cgst")));
            sgst = sgst.add(asMoney(row.get("sgst")));
            total = total.add(asMoney(row.get("total")));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("bills", rows.size());
        out.put("activeBills", activeCount);
        out.put("taxable", money(taxable));
        out.put("discount", money(discount));
        out.put("cgst", money(cgst));
        out.put("sgst", money(sgst));
        out.put("total", money(total));
        return out;
    }

    private static void writeBillsSheet(
        Workbook wb,
        String name,
        List<Map<String, Object>> rows,
        CellStyle headerStyle,
        CellStyle moneyStyle
    ) {
        Sheet sheet = wb.createSheet(name);
        Row header = sheet.createRow(0);
        for (int i = 0; i < BILL_HEADERS.length; i++) {
            Cell c = header.createCell(i);
            c.setCellValue(BILL_HEADERS[i]);
            c.setCellStyle(headerStyle);
        }
        int r = 1;
        for (Map<String, Object> row : rows) {
            Row excel = sheet.createRow(r++);
            excel.createCell(0).setCellValue(str(row.get("date")));
            excel.createCell(1).setCellValue(str(row.get("time")));
            excel.createCell(2).setCellValue(str(row.get("invoiceNo")));
            excel.createCell(3).setCellValue(str(row.get("type")));
            excel.createCell(4).setCellValue(str(row.get("customer")));
            excel.createCell(5).setCellValue(str(row.get("phone")));
            excel.createCell(6).setCellValue(str(row.get("gstin")));
            moneyCell(excel, 7, row.get("taxable"), moneyStyle);
            moneyCell(excel, 8, row.get("discount"), moneyStyle);
            moneyCell(excel, 9, row.get("cgst"), moneyStyle);
            moneyCell(excel, 10, row.get("sgst"), moneyStyle);
            moneyCell(excel, 11, row.get("total"), moneyStyle);
            excel.createCell(12).setCellValue(str(row.get("payment")));
            excel.createCell(13).setCellValue(str(row.get("status")));
        }
        if (!rows.isEmpty()) {
            Row sum = sheet.createRow(r);
            Cell label = sum.createCell(0);
            label.setCellValue("TOTAL (active bills)");
            label.setCellStyle(headerStyle);
            Map<String, Object> t = totals(rows);
            moneyCell(sum, 7, t.get("taxable"), moneyStyle);
            moneyCell(sum, 8, t.get("discount"), moneyStyle);
            moneyCell(sum, 9, t.get("cgst"), moneyStyle);
            moneyCell(sum, 10, t.get("sgst"), moneyStyle);
            moneyCell(sum, 11, t.get("total"), moneyStyle);
        }
        for (int i = 0; i < BILL_HEADERS.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private static void writeTotalsSheet(
        Workbook wb,
        Map<String, Object> data,
        CellStyle headerStyle,
        CellStyle moneyStyle
    ) {
        Sheet sheet = wb.createSheet("TOTALS");
        String[] headers = {"Group", "Bills", "Active", "Taxable", "Discount", "CGST", "SGST", "Total"};
        Row header = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = header.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }
        writeTotalRow(sheet, 1, "All sales", (Map<?, ?>) data.get("totals"), moneyStyle);
        writeTotalRow(sheet, 2, "B2C (retail)", (Map<?, ?>) data.get("b2cTotals"), moneyStyle);
        writeTotalRow(sheet, 3, "B2B", (Map<?, ?>) data.get("b2bTotals"), moneyStyle);
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private static void writeTotalRow(Sheet sheet, int rowNum, String label, Map<?, ?> t, CellStyle moneyStyle) {
        Row row = sheet.createRow(rowNum);
        row.createCell(0).setCellValue(label);
        row.createCell(1).setCellValue(asInt(t.get("bills")));
        row.createCell(2).setCellValue(asInt(t.get("activeBills")));
        moneyCell(row, 3, t.get("taxable"), moneyStyle);
        moneyCell(row, 4, t.get("discount"), moneyStyle);
        moneyCell(row, 5, t.get("cgst"), moneyStyle);
        moneyCell(row, 6, t.get("sgst"), moneyStyle);
        moneyCell(row, 7, t.get("total"), moneyStyle);
    }

    private static void moneyCell(Row row, int col, Object value, CellStyle moneyStyle) {
        Cell c = row.createCell(col);
        c.setCellValue(asMoney(value).doubleValue());
        c.setCellStyle(moneyStyle);
    }

    private static BigDecimal asMoney(Object value) {
        if (value instanceof BigDecimal bd) {
            return bd;
        }
        if (value instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue()).setScale(2, RoundingMode.HALF_UP);
        }
        return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    private static int asInt(Object value) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        return 0;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static BigDecimal money(BigDecimal value) {
        return nz(value).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
