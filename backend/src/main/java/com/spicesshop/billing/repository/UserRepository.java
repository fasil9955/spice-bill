package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Integer> {
    Optional<User> findByCompanyNameAndRole(String companyName, User.Role role);
    
    boolean existsByCompanyNameAndRole(String companyName, User.Role role);
}
