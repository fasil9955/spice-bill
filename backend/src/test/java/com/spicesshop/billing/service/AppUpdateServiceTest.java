package com.spicesshop.billing.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppUpdateServiceTest {

    @Test
    void newerPatchIsDetected() {
        assertTrue(AppUpdateService.compareVersions("1.1.1", "1.1.0") > 0);
    }

    @Test
    void sameVersionIsNotNewer() {
        assertEquals(0, AppUpdateService.compareVersions("1.1.0", "1.1.0"));
    }

    @Test
    void olderVersionIsIgnored() {
        assertTrue(AppUpdateService.compareVersions("1.0.9", "1.1.0") < 0);
    }

    @Test
    void vPrefixIsAccepted() {
        assertTrue(AppUpdateService.compareVersions("v1.2.0", "1.1.9") > 0);
    }
}
