package com.spicesshop.billing.util;

import java.time.LocalDate;

/**
 * GST Rule 46(b) retail invoice serial: consecutive, unique for the Indian
 * financial year (1 April–31 March), letters/digits/hyphen/slash, max 16 chars.
 * Example: R/2627/00001 (12 characters).
 */
public final class GstInvoiceNumbers {

    public static final String RETAIL_SERIES = "R";

    private GstInvoiceNumbers() {}

    public static LocalDate financialYearStart(LocalDate date) {
        int year = date.getMonthValue() >= 4 ? date.getYear() : date.getYear() - 1;
        return LocalDate.of(year, 4, 1);
    }

    public static String financialYearCode(LocalDate date) {
        LocalDate start = financialYearStart(date);
        int from = start.getYear() % 100;
        int to = (start.getYear() + 1) % 100;
        return String.format("%02d%02d", from, to);
    }

    public static String formatRetail(LocalDate date, int sequence) {
        return RETAIL_SERIES + "/" + financialYearCode(date) + "/" + String.format("%05d", sequence);
    }

    public static String likePrefix(LocalDate date) {
        return RETAIL_SERIES + "/" + financialYearCode(date) + "/%";
    }

    public static int parseSequence(String invoiceNumber) {
        if (invoiceNumber == null) {
            return 0;
        }
        int slash = invoiceNumber.lastIndexOf('/');
        if (slash < 0 || slash >= invoiceNumber.length() - 1) {
            return 0;
        }
        try {
            return Integer.parseInt(invoiceNumber.substring(slash + 1));
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
