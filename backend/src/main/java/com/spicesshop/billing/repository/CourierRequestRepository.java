package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.CourierRequest;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CourierRequestRepository extends JpaRepository<CourierRequest, Integer> {
  List<CourierRequest> findByCompanyNameOrderByCreatedAtDesc(String companyName);

  List<CourierRequest> findByInvoiceId(Integer invoiceId);

  List<CourierRequest> findByCompanyNameAndInvoiceNumber(String companyName, String invoiceNumber);

  void deleteByInvoiceId(Integer invoiceId);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(value = "UPDATE courier_requests cr INNER JOIN invoices i ON cr.invoice_id = i.invoice_id INNER JOIN users u ON i.cashier_id = u.user_id SET cr.invoice_number = i.invoice_number WHERE u.company_name = :companyName AND (i.invoice_type IS NULL OR i.invoice_type <> 'B2B')", nativeQuery = true)
  int syncRetailCourierInvoiceNumbers(@Param("companyName") String companyName);
}




