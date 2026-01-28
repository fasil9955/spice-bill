package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.B2BCustomer;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface B2BCustomerRepository extends JpaRepository<B2BCustomer, Integer> {
  Optional<B2BCustomer> findByGstNumber(String companyName);
  
  List<B2BCustomer> findByCompanyNameContainingIgnoreCase(String companyName);
  
  List<B2BCustomer> findByPhone(String companyName);
  
  List<B2BCustomer> findByCompanyName(String companyName);
}




