package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.B2BCustomer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface B2BCustomerRepository extends JpaRepository<B2BCustomer, Integer> {
  Optional<B2BCustomer> findByGstNumber(String gstNumber);

  List<B2BCustomer> findByCompanyName(String companyName);

  /** Customers for this company OR with null/blank company_name (e.g. inserted directly in DB). */
  @Query("SELECT c FROM B2BCustomer c WHERE c.companyName = :companyName OR c.companyName IS NULL OR c.companyName = ''")
  List<B2BCustomer> findByCompanyNameOrUnassigned(@Param("companyName") String companyName);

  /** Find B2B customers for the given seller company, filtered by customer name / GST / phone. */
  @Query("SELECT c FROM B2BCustomer c WHERE (c.companyName = :companyName OR c.companyName IS NULL OR c.companyName = '') AND (" +
      "LOWER(c.customerName) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
      "LOWER(COALESCE(c.gstNumber, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
      "LOWER(COALESCE(c.phone, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
      "LOWER(COALESCE(c.email, '')) LIKE LOWER(CONCAT('%', :q, '%')) )")
  List<B2BCustomer> findByCompanyNameOrUnassignedAndSearchQuery(@Param("companyName") String companyName, @Param("q") String q);
}




