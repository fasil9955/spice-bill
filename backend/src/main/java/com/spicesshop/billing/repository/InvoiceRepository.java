package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.Invoice;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Integer> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    
    List<Invoice> findByCashier_UserId(Integer userId);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND DATE(i.createdAt) = :date")
    List<Invoice> findByCompanyNameAndDate(@Param("companyName") String companyName, @Param("date") LocalDate date);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.createdAt BETWEEN :startDate AND :endDate")
    List<Invoice> findByCompanyNameAndDateRange(@Param("companyName") String companyName, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.cashier.companyName = :companyName AND DATE(i.createdAt) = :date")
    Long countByCompanyNameAndDate(@Param("companyName") String companyName, @Param("date") LocalDate date);
    
    @Query("SELECT MAX(i.invoiceNumber) FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.invoiceType <> 'B2B' AND i.invoiceNumber LIKE :prefix")
    String findMaxInvoiceNumberByPrefix(@Param("companyName") String companyName, @Param("prefix") String prefix);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.invoiceType = 'B2B' AND i.createdAt BETWEEN :startDate AND :endDate")
    List<Invoice> findB2BInvoicesByCompanyAndDateRange(@Param("companyName") String companyName, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.invoiceType = 'B2B'")
    List<Invoice> findB2BInvoicesByCompany(@Param("companyName") String companyName);
    
    @Query("SELECT i.invoiceNumber FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.invoiceType = 'B2B' ORDER BY i.invoiceId DESC LIMIT 1")
    Optional<String> findLastB2BInvoiceNumber(@Param("companyName") String companyName);
    
    @Query(value = "SELECT MAX(CAST(REPLACE(i.invoice_number,'B2B-','') AS UNSIGNED)) FROM invoices i JOIN users u ON i.cashier_id = u.user_id WHERE u.company_name = :companyName AND i.invoice_type = 'B2B'", nativeQuery = true)
    Integer findMaxB2BInvoiceSequence(@Param("companyName") String companyName);
    
    @Query("SELECT i FROM Invoice i WHERE DATE(i.createdAt) = :date")
    List<Invoice> findByDate(@Param("date") LocalDate date);
    
    @Query("SELECT i FROM Invoice i WHERE i.createdAt BETWEEN :startDate AND :endDate")
    List<Invoice> findByDateRange(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(i) FROM Invoice i WHERE DATE(i.createdAt) = :date")
    Long countByDate(@Param("date") LocalDate date);
    
    List<Invoice> findByStatus(Invoice.InvoiceStatus status);
}
