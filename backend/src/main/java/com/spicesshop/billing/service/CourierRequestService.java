package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.CourierRequestCreate;
import com.spicesshop.billing.model.CourierRequest;
import com.spicesshop.billing.model.Invoice;
import com.spicesshop.billing.repository.CourierRequestRepository;
import com.spicesshop.billing.repository.InvoiceRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CourierRequestService {

    @Autowired
    private CourierRequestRepository courierRequestRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;

    public CourierRequest createCourierRequest(String companyName, CourierRequestCreate payload) {
        if (payload == null || payload.getCustomerName() == null || payload.getCustomerName().trim().isEmpty()) {
            throw new RuntimeException("Customer name is required");
        }

        CourierRequest courierRequest = new CourierRequest();
        courierRequest.setCompanyName(companyName);
        courierRequest.setCustomerName(payload.getCustomerName().trim());
        courierRequest.setAddress(payload.getAddress());
        courierRequest.setPhone1(payload.getPhone1());
        courierRequest.setPhone2(payload.getPhone2());
        courierRequest.setStatus(normalizeStatus(payload.getStatus()));
        courierRequest.setTrackingId(payload.getTrackingId());

        if (payload.getInvoiceId() != null) {
            Invoice invoice = this.invoiceRepository.findById(payload.getInvoiceId())
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
            
            String invoiceCompany = (invoice.getCashier() != null) ? invoice.getCashier().getCompanyName() : null;
            if (invoiceCompany == null || !invoiceCompany.equals(companyName)) {
                throw new RuntimeException("Invoice does not belong to this company");
            }
            courierRequest.setInvoiceId(invoice.getInvoiceId());
            courierRequest.setInvoiceNumber(invoice.getInvoiceNumber());
        } else {
            courierRequest.setInvoiceId(null);
            courierRequest.setInvoiceNumber(payload.getInvoiceNumber());
        }

        return this.courierRequestRepository.save(courierRequest);
    }

    public List<CourierRequest> getCouriersByCompany(String companyName) {
        return this.courierRequestRepository.findByCompanyNameOrderByCreatedAtDesc(companyName);
    }

    public CourierRequest updateCourierRequest(String companyName, Integer courierId, CourierRequestCreate payload) {
        if (payload == null || payload.getCustomerName() == null || payload.getCustomerName().trim().isEmpty()) {
            throw new RuntimeException("Customer name is required");
        }

        CourierRequest courierRequest = this.courierRequestRepository.findById(courierId)
            .orElseThrow(() -> new RuntimeException("Courier request not found"));

        if (!companyName.equals(courierRequest.getCompanyName())) {
            throw new RuntimeException("Courier request does not belong to this company");
        }

        courierRequest.setCustomerName(payload.getCustomerName().trim());
        courierRequest.setAddress(payload.getAddress());
        courierRequest.setPhone1(payload.getPhone1());
        courierRequest.setPhone2(payload.getPhone2());
        courierRequest.setStatus(normalizeStatus(payload.getStatus()));
        courierRequest.setTrackingId(payload.getTrackingId());

        return this.courierRequestRepository.save(courierRequest);
    }

    private String normalizeStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return "PENDING";
        }
        String value = status.trim().toUpperCase();
        if (!value.equals("PENDING") && !value.equals("SHIPPED")) {
            return "PENDING";
        }
        return value;
    }
}
