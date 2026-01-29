package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.Category;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    Optional<Category> findByCategoryName(String categoryName);
    
    boolean existsByCategoryName(String categoryName);
}
