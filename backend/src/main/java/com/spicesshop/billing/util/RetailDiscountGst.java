package com.spicesshop.billing.util;

import com.spicesshop.billing.model.InvoiceItem;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Retail bill-level discount before GST (CGST Act s.15).
 * Prefer 18% lines up to 80% of those amounts; leftover goes to 5% lines.
 */
public final class RetailDiscountGst {

    public static final BigDecimal GST_18 = new BigDecimal("18");
    public static final BigDecimal GST_5 = new BigDecimal("5");
    private static final BigDecimal EIGHTEEN_CAP = new BigDecimal("0.80");
    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final BigDecimal TWO = new BigDecimal("2");
    private static final int MONEY = 2;

    private RetailDiscountGst() {}

    public static void applyBillDiscountBeforeGst(List<InvoiceItem> items, BigDecimal billDiscount) {
        if (items == null || items.isEmpty()) {
            return;
        }
        int n = items.size();
        BigDecimal[] gross = new BigDecimal[n];
        BigDecimal[] gstPct = new BigDecimal[n];
        for (int i = 0; i < n; i++) {
            InvoiceItem item = items.get(i);
            gross[i] = nz(item.getTotalPrice());
            gstPct[i] = nz(item.getGstPercentage());
        }
        BigDecimal[] alloc = allocateDiscount(gross, gstPct, billDiscount);
        for (int i = 0; i < n; i++) {
            InvoiceItem item = items.get(i);
            BigDecimal extra = alloc[i];
            if (extra.compareTo(BigDecimal.ZERO) > 0) {
                item.setDiscountAmount(nz(item.getDiscountAmount()).add(extra));
            }
            BigDecimal net = gross[i].subtract(extra).max(BigDecimal.ZERO).setScale(MONEY, RoundingMode.HALF_UP);
            applyInclusiveGst(item, net);
        }
    }

    public static BigDecimal[] allocateDiscount(BigDecimal[] gross, BigDecimal[] gstPct, BigDecimal discount) {
        int n = gross.length;
        BigDecimal[] alloc = new BigDecimal[n];
        BigDecimal sum = BigDecimal.ZERO;
        for (int i = 0; i < n; i++) {
            alloc[i] = BigDecimal.ZERO.setScale(MONEY, RoundingMode.HALF_UP);
            sum = sum.add(nz(gross[i]));
        }
        BigDecimal remaining = nz(discount).min(sum).setScale(MONEY, RoundingMode.HALF_UP);
        remaining = allocateByCapacity(gross, gstPct, alloc, remaining, GST_18, EIGHTEEN_CAP);
        remaining = allocateByCapacity(gross, gstPct, alloc, remaining, GST_5, BigDecimal.ONE);
        remaining = allocateOtherRates(gross, gstPct, alloc, remaining);
        allocateByCapacity(gross, gstPct, alloc, remaining, GST_18, BigDecimal.ONE);
        return alloc;
    }

    private static BigDecimal allocateByCapacity(
        BigDecimal[] gross,
        BigDecimal[] gstPct,
        BigDecimal[] alloc,
        BigDecimal remaining,
        BigDecimal rate,
        BigDecimal capFraction
    ) {
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            return remaining;
        }
        int n = gross.length;
        BigDecimal[] cap = new BigDecimal[n];
        BigDecimal totalCap = BigDecimal.ZERO;
        int last = -1;
        for (int i = 0; i < n; i++) {
            if (nz(gstPct[i]).compareTo(rate) != 0) {
                cap[i] = BigDecimal.ZERO;
                continue;
            }
            BigDecimal maxOnLine = nz(gross[i]).multiply(capFraction).setScale(MONEY, RoundingMode.HALF_UP);
            cap[i] = maxOnLine.subtract(alloc[i]).max(BigDecimal.ZERO);
            if (cap[i].compareTo(BigDecimal.ZERO) > 0) {
                totalCap = totalCap.add(cap[i]);
                last = i;
            }
        }
        if (totalCap.compareTo(BigDecimal.ZERO) <= 0) {
            return remaining;
        }
        BigDecimal take = remaining.min(totalCap);
        BigDecimal pool = take;
        for (int i = 0; i < n; i++) {
            if (cap[i].compareTo(BigDecimal.ZERO) <= 0 || pool.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal share = i == last
                ? pool.min(cap[i])
                : take.multiply(cap[i]).divide(totalCap, MONEY, RoundingMode.HALF_UP).min(cap[i]).min(pool);
            alloc[i] = alloc[i].add(share);
            pool = pool.subtract(share);
        }
        if (pool.compareTo(BigDecimal.ZERO) > 0 && last >= 0) {
            BigDecimal room = nz(gross[last]).subtract(alloc[last]).max(BigDecimal.ZERO);
            BigDecimal add = pool.min(room).min(cap[last]);
            alloc[last] = alloc[last].add(add);
            pool = pool.subtract(add);
        }
        return remaining.subtract(take).add(pool).setScale(MONEY, RoundingMode.HALF_UP);
    }

    private static BigDecimal allocateOtherRates(
        BigDecimal[] gross,
        BigDecimal[] gstPct,
        BigDecimal[] alloc,
        BigDecimal remaining
    ) {
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            return remaining;
        }
        int n = gross.length;
        BigDecimal[] cap = new BigDecimal[n];
        BigDecimal totalCap = BigDecimal.ZERO;
        int last = -1;
        for (int i = 0; i < n; i++) {
            BigDecimal pct = nz(gstPct[i]);
            if (pct.compareTo(GST_18) == 0 || pct.compareTo(GST_5) == 0) {
                cap[i] = BigDecimal.ZERO;
                continue;
            }
            cap[i] = nz(gross[i]).subtract(alloc[i]).max(BigDecimal.ZERO);
            if (cap[i].compareTo(BigDecimal.ZERO) > 0) {
                totalCap = totalCap.add(cap[i]);
                last = i;
            }
        }
        if (totalCap.compareTo(BigDecimal.ZERO) <= 0) {
            return remaining;
        }
        BigDecimal take = remaining.min(totalCap);
        BigDecimal pool = take;
        for (int i = 0; i < n; i++) {
            if (cap[i].compareTo(BigDecimal.ZERO) <= 0 || pool.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal share = i == last
                ? pool.min(cap[i])
                : take.multiply(cap[i]).divide(totalCap, MONEY, RoundingMode.HALF_UP).min(cap[i]).min(pool);
            alloc[i] = alloc[i].add(share);
            pool = pool.subtract(share);
        }
        return remaining.subtract(take).add(pool).setScale(MONEY, RoundingMode.HALF_UP);
    }

    public static void applyInclusiveGst(InvoiceItem item, BigDecimal netInclusive) {
        item.setTotalPrice(netInclusive);
        BigDecimal gstPct = nz(item.getGstPercentage());
        if (gstPct.compareTo(BigDecimal.ZERO) > 0 && netInclusive.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal onePlusGst = BigDecimal.ONE.add(gstPct.divide(HUNDRED, 6, RoundingMode.HALF_UP));
            BigDecimal taxable = netInclusive.divide(onePlusGst, MONEY, RoundingMode.HALF_UP);
            BigDecimal gstAmount = netInclusive.subtract(taxable);
            BigDecimal half = gstAmount.divide(TWO, MONEY, RoundingMode.HALF_UP);
            item.setCgstAmount(half);
            item.setSgstAmount(half);
        } else {
            item.setCgstAmount(BigDecimal.ZERO.setScale(MONEY, RoundingMode.HALF_UP));
            item.setSgstAmount(BigDecimal.ZERO.setScale(MONEY, RoundingMode.HALF_UP));
        }
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }
}
