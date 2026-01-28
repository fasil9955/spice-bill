package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.InvoiceSequence;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceSequenceRepository extends JpaRepository<InvoiceSequence, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM InvoiceSequence s WHERE s.companyName = :companyName AND s.sequenceDate = :date")
    Optional<InvoiceSequence> findByCompanyNameAndDateForUpdate(@Param("companyName") String companyName, @Param("date") LocalDate date);
    
    @Query("SELECT s FROM InvoiceSequence s WHERE s.companyName = :companyName AND s.sequenceDate = :date")
    Optional<InvoiceSequence> findByCompanyNameAndSequenceDate(@Param("companyName") String companyName, @Param("date") LocalDate date);
}
