package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.B2cGstSplit;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface B2cGstSplitRepository extends JpaRepository<B2cGstSplit, Integer> {
    Optional<B2cGstSplit> findByCompanyNameAndYearAndMonth(String companyName, Integer year, Integer month);
}
