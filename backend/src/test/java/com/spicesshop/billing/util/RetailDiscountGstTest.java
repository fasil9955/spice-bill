package com.spicesshop.billing.util;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RetailDiscountGstTest {

    @Test
    void discountStaysOnEighteenPercentWhenUnderEightyPercentCap() {
        BigDecimal[] alloc = RetailDiscountGst.allocateDiscount(
            new BigDecimal[] { new BigDecimal("100.00"), new BigDecimal("200.00") },
            new BigDecimal[] { new BigDecimal("18"), new BigDecimal("5") },
            new BigDecimal("50.00")
        );
        assertEquals(new BigDecimal("50.00"), alloc[0]);
        assertEquals(new BigDecimal("0.00"), alloc[1]);
    }

    @Test
    void leftoverOverEightyPercentOfEighteenGoesToFivePercent() {
        BigDecimal[] alloc = RetailDiscountGst.allocateDiscount(
            new BigDecimal[] { new BigDecimal("100.00"), new BigDecimal("200.00") },
            new BigDecimal[] { new BigDecimal("18"), new BigDecimal("5") },
            new BigDecimal("90.00")
        );
        assertEquals(new BigDecimal("80.00"), alloc[0]);
        assertEquals(new BigDecimal("10.00"), alloc[1]);
    }

    @Test
    void fivePercentOnlyGetsTheFullDiscount() {
        BigDecimal[] alloc = RetailDiscountGst.allocateDiscount(
            new BigDecimal[] { new BigDecimal("200.00") },
            new BigDecimal[] { new BigDecimal("5") },
            new BigDecimal("40.00")
        );
        assertEquals(new BigDecimal("40.00"), alloc[0]);
    }
}
