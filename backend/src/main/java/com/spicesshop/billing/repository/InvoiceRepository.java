package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.Invoice;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, Integer> {
    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);
    
    List<Invoice> findByCashier_UserId(Integer userId);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND DATE(i.createdAt) = :date")
    List<Invoice> findByCompanyNameAndDate(@Param("companyName") String companyName, @Param("date") LocalDate date);

    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND DATE(i.createdAt) = :date "
        + "AND i.invoiceType = 'RETAIL' AND i.status = com.spicesshop.billing.model.Invoice$InvoiceStatus.ACTIVE "
        + "AND i.customerPhone IS NOT NULL AND i.customerPhone <> ''")
    List<Invoice> findRetailWithCustomerPhoneByCompanyAndDate(@Param("companyName") String companyName, @Param("date") LocalDate date);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.createdAt BETWEEN :startDate AND :endDate")
    List<Invoice> findByCompanyNameAndDateRange(@Param("companyName") String companyName, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT COUNT(i) FROM Invoice i WHERE i.cashier.companyName = :companyName AND DATE(i.createdAt) = :date")
    Long countByCompanyNameAndDate(@Param("companyName") String companyName, @Param("date") LocalDate date);
    
    @Query("SELECT MAX(i.invoiceNumber) FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.invoiceType <> 'B2B' AND i.invoiceNumber LIKE :prefix")
    String findMaxInvoiceNumberByPrefix(@Param("companyName") String companyName, @Param("prefix") String prefix);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.invoiceType IN ('B2B', 'CREDIT_NOTE', 'DEBIT_NOTE') AND i.createdAt BETWEEN :startDate AND :endDate")
    List<Invoice> findB2BInvoicesByCompanyAndDateRange(@Param("companyName") String companyName, @Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.invoiceType IN ('B2B', 'CREDIT_NOTE', 'DEBIT_NOTE')")
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

    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.status = com.spicesshop.billing.model.Invoice$InvoiceStatus.CANCELLED AND (i.invoiceType IS NULL OR i.invoiceType <> 'B2B')")
    List<Invoice> findCancelledNonB2BByCompany(@Param("companyName") String companyName);

    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND (i.invoiceType IS NULL OR i.invoiceType <> 'B2B') ORDER BY i.createdAt ASC, i.invoiceId ASC")
    List<Invoice> findRetailInvoicesByCompanyOrdered(@Param("companyName") String companyName);

    @Query("SELECT i.invoiceId, i.createdAt, i.invoiceNumber FROM Invoice i WHERE i.cashier.companyName = :companyName AND (i.invoiceType IS NULL OR i.invoiceType <> 'B2B') ORDER BY i.createdAt ASC, i.invoiceId ASC")
    List<Object[]> findRetailInvoiceNumberRows(@Param("companyName") String companyName);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE invoices i INNER JOIN users u ON i.cashier_id = u.user_id SET i.invoice_number = CONCAT('__MIG-', i.invoice_id) WHERE u.company_name = :companyName AND (i.invoice_type IS NULL OR i.invoice_type <> 'B2B')", nativeQuery = true)
    int migrateRetailNumbersToTemp(@Param("companyName") String companyName);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "UPDATE invoices SET invoice_number = :newNumber WHERE invoice_id = :invoiceId", nativeQuery = true)
    int updateInvoiceNumberById(@Param("invoiceId") Integer invoiceId, @Param("newNumber") String newNumber);

    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND i.paymentMethod = com.spicesshop.billing.model.Invoice$PaymentMethod.CASH AND (i.invoiceType IS NULL OR i.invoiceType <> 'B2B')")
    List<Invoice> findRetailCashInvoicesByCompany(@Param("companyName") String companyName);

    @Query("SELECT i FROM Invoice i WHERE i.cashier.companyName = :companyName AND DATE(i.createdAt) = :date AND i.paymentMethod = com.spicesshop.billing.model.Invoice$PaymentMethod.CASH AND (i.invoiceType IS NULL OR i.invoiceType <> 'B2B')")
    List<Invoice> findRetailCashInvoicesByCompanyAndDate(@Param("companyName") String companyName, @Param("date") LocalDate date);
}
