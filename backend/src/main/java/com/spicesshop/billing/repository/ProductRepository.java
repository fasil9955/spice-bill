package com.spicesshop.billing.repository;

import com.spicesshop.billing.model.Product;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Integer> {
    List<Product> findByCompanyNameAndIsActiveTrue(String companyName);
    
    Optional<Product> findByCompanyNameAndBarcode(String companyName, String barcode);
    
    Optional<Product> findByCompanyNameAndProductCode(String companyName, String productCode);
    
    List<Product> findByCompanyNameAndProductName(String companyName, String productName);
    
    @Query("SELECT p FROM Product p WHERE p.companyName = :companyName AND p.quantity <= p.minStockLevel AND p.isActive = true")
    List<Product> findLowStockProductsByCompany(String companyName);

    // Used for auto-generating barcodes in the old format: 1000A, 1001A, ...
    // Matches barcodes like 1234 or 1234A and returns the MAX numeric prefix.
    @Query(
        value = "SELECT MAX(CAST(CASE WHEN UPPER(RIGHT(barcode, 1)) = 'A' THEN LEFT(barcode, LENGTH(barcode) - 1) ELSE barcode END AS UNSIGNED)) " +
                "FROM products WHERE company_name = ?1 AND barcode REGEXP '^[0-9]+[Aa]?$'",
        nativeQuery = true
    )
    Integer findMaxNumericBarcodeByCompanyName(String companyName);
    
    Optional<Product> findByBarcode(String barcode);
    
    Optional<Product> findByProductCode(String productCode);
    
    List<Product> findByProductName(String productName);
    
    List<Product> findByIsActiveTrue();
    
    @Query("SELECT p FROM Product p WHERE p.quantity <= p.minStockLevel AND p.isActive = true")
    List<Product> findLowStockProducts();
}
