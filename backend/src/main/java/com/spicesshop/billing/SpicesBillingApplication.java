package com.spicesshop.billing;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SpicesBillingApplication {

    public static void main(String[] args) {
        SpringApplication.run(SpicesBillingApplication.class, args);
    }
}
