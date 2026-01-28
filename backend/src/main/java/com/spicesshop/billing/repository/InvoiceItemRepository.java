package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.InvoiceItem;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, Integer> {
    List<InvoiceItem> findByInvoice_InvoiceId(Integer invoiceId);
    
    List<InvoiceItem> findByProduct_ProductId(Integer productId);
    
    @Query("SELECT ii FROM InvoiceItem ii WHERE DATE(ii.invoice.createdAt) = :date")
    List<InvoiceItem> findByDate(@Param("date") LocalDate date);
}
