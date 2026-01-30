package com.spicesshop.billing.controller;

import com.spicesshop.billing.dto.CourierRequestCreate;
import com.spicesshop.billing.model.CourierRequest;
import com.spicesshop.billing.service.CourierRequestService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/couriers"})
@CrossOrigin(origins = {"*"})
public class CourierRequestController {

    @Autowired
    private CourierRequestService courierRequestService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping
    public ResponseEntity<?> getAllCouriers(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            List<CourierRequest> couriers = this.courierRequestService.getCouriersByCompany(companyName);
            return ResponseEntity.ok(couriers);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createCourier(@RequestBody CourierRequestCreate payload, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            CourierRequest created = this.courierRequestService.createCourierRequest(companyName, payload);
            return ResponseEntity.ok(created);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping({"/{id}"})
    public ResponseEntity<?> updateCourier(@PathVariable Integer id, @RequestBody CourierRequestCreate payload, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            CourierRequest updated = this.courierRequestService.updateCourierRequest(companyName, id, payload);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<?> deleteCourier(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            this.courierRequestService.deleteCourierRequest(companyName, id);
            return ResponseEntity.ok(Map.of("message", "Courier request deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
