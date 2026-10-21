package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.HubOutbox;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HubOutboxRepository extends JpaRepository<HubOutbox, Long> {
    Optional<HubOutbox> findByCompanyNameAndReportDate(String companyName, LocalDate reportDate);

    List<HubOutbox> findAllByOrderByCreatedAtAsc();
}
