package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.CourierRequest;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourierRequestRepository extends JpaRepository<CourierRequest, Integer> {
  List<CourierRequest> findByCompanyNameOrderByCreatedAtDesc(String companyName);

  List<CourierRequest> findByInvoiceId(Integer invoiceId);

  List<CourierRequest> findByCompanyNameAndInvoiceNumber(String companyName, String invoiceNumber);

  void deleteByInvoiceId(Integer invoiceId);
}




