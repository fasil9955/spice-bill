package com.spicesshop.billing.controller;

import com.spicesshop.billing.dto.BarcodeParseResult;
import com.spicesshop.billing.model.Product;
import com.spicesshop.billing.service.ProductService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/products"})
@CrossOrigin(origins = {"*"})
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private CompanyExtractor companyExtractor;

    @GetMapping
    public ResponseEntity<List<Product>> getAllProducts(HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.productService.getAllProducts(companyName));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping({"/{id}"})
    public ResponseEntity<Product> getProductById(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return this.productService.getProductById(id, companyName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping({"/barcode/{barcode}"})
    public ResponseEntity<Product> getProductByBarcode(@PathVariable String barcode, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return this.productService.getProductByBarcode(barcode, companyName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping({"/barcode/parse/{fullBarcode}"})
    public ResponseEntity<BarcodeParseResult> parseBarcode(@PathVariable String fullBarcode, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return this.productService.parseBarcodeWithWeight(fullBarcode, companyName)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping
    public ResponseEntity<?> createProduct(@RequestBody Product product, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            product.setCompanyName(companyName);
            return ResponseEntity.ok(this.productService.createProduct(product));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping({"/{id}"})
    public ResponseEntity<?> updateProduct(@PathVariable Integer id, @RequestBody Product product, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            return ResponseEntity.ok(this.productService.updateProduct(id, product, companyName));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping({"/{id}"})
    public ResponseEntity<?> deleteProduct(@PathVariable Integer id, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            this.productService.deleteProduct(id, companyName);
            return ResponseEntity.ok(Map.of("message", "Product deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
