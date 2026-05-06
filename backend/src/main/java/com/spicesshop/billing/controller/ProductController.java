package com.spicesshop.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spicesshop.billing.dto.BarcodeParseResult;
import com.spicesshop.billing.model.Product;
import com.spicesshop.billing.service.ProductService;
import com.spicesshop.billing.util.CompanyExtractor;
import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
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

    @Autowired
    private ObjectMapper objectMapper;

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
    public ResponseEntity<?> createProduct(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            Product product = this.objectMapper.convertValue(body, Product.class);
            product.setCompanyName(companyName);
            // Explicitly set unit from request so it is never lost (e.g. "pcs" not overwritten by default)
            if (body.containsKey("unit")) {
                Object u = body.get("unit");
                String unitVal = (u == null || "".equals(u)) ? null : u.toString().trim();
                product.setUnit("".equals(unitVal) ? null : unitVal);
            }
            return ResponseEntity.ok(this.productService.createProduct(product));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Increase on-hand quantity without sending the full product body (billing quick stock-in).
     * Body: { "addQty": number }
     */
    @PatchMapping({"/{id}/stock-adjust"})
    public ResponseEntity<?> adjustStock(@PathVariable Integer id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            if (companyName == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));
            }
            Object aq = body != null ? body.get("addQty") : null;
            if (aq == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "addQty is required"));
            }
            BigDecimal addQty = new BigDecimal(aq.toString());
            Product updated = this.productService.addStockDelta(id, addQty, companyName);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping({"/{id}"})
    public ResponseEntity<?> updateProduct(@PathVariable Integer id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        try {
            String companyName = this.companyExtractor.extractCompanyFromRequest(request);
            Product product = this.objectMapper.convertValue(body, Product.class);
            // Explicitly set unit from request so it is never lost
            if (body.containsKey("unit")) {
                Object u = body.get("unit");
                String unitVal = (u == null || "".equals(u)) ? null : u.toString().trim();
                product.setUnit("".equals(unitVal) ? null : unitVal);
            }
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
