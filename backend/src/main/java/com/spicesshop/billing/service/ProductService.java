package com.spicesshop.billing.service;

import com.spicesshop.billing.dto.BarcodeParseResult;
import com.spicesshop.billing.model.Category;
import com.spicesshop.billing.model.InvoiceItem;
import com.spicesshop.billing.model.Product;
import com.spicesshop.billing.repository.CategoryRepository;
import com.spicesshop.billing.repository.InvoiceItemRepository;
import com.spicesshop.billing.repository.ProductRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private InvoiceItemRepository invoiceItemRepository;

    public List<Product> getAllProducts(String companyName) {
        return this.productRepository.findByCompanyNameAndIsActiveTrue(companyName);
    }

    public Optional<Product> getProductById(Integer id, String companyName) {
        Optional<Product> product = this.productRepository.findById(id);
        if (product.isPresent() && product.get().getCompanyName().equals(companyName)) {
            return product;
        }
        return Optional.empty();
    }

    public Optional<Product> getProductByBarcode(String barcode, String companyName) {
        return this.productRepository.findByCompanyNameAndBarcode(companyName, barcode);
    }

    public Optional<BarcodeParseResult> parseBarcodeWithWeight(String fullBarcode, String companyName) {
        if (fullBarcode == null || fullBarcode.trim().isEmpty()) {
            return Optional.empty();
        }

        Optional<Product> exactMatch = this.productRepository.findByCompanyNameAndBarcode(companyName, fullBarcode);
        if (exactMatch.isPresent()) {
            return Optional.of(new BarcodeParseResult(exactMatch.get(), BigDecimal.ZERO, fullBarcode, fullBarcode));
        }

        Pattern pattern = Pattern.compile("^(.+?[A-Za-z])(\\d+)$");
        Matcher matcher = pattern.matcher(fullBarcode);

        if (matcher.matches()) {
            String baseBarcode = matcher.group(1);
            String weightStr = matcher.group(2);
            try {
                BigDecimal weight = new BigDecimal(weightStr);
                Optional<Product> product = this.productRepository.findByCompanyNameAndBarcode(companyName, baseBarcode);
                if (product.isPresent()) {
                    return Optional.of(new BarcodeParseResult(product.get(), weight, baseBarcode, fullBarcode));
                }
            } catch (NumberFormatException ignored) {}
        }

        Optional<Product> baseMatch = this.productRepository.findByCompanyNameAndBarcode(companyName, fullBarcode);
        if (baseMatch.isPresent()) {
            return Optional.of(new BarcodeParseResult(baseMatch.get(), BigDecimal.ZERO, fullBarcode, fullBarcode));
        }

        return Optional.empty();
    }

    public List<Product> getProductsByName(String productName, String companyName) {
        return this.productRepository.findByCompanyNameAndProductName(companyName, productName);
    }

    public List<Product> getLowStockProducts(String companyName) {
        return this.productRepository.findLowStockProductsByCompany(companyName);
    }

    @Transactional
    public Product createProduct(Product product) {
        String companyName = product.getCompanyName();
        if (companyName == null || companyName.trim().isEmpty()) {
            throw new RuntimeException("Company name is required");
        }

        // Auto-generate barcode in the old format: 1000A, 1001A, ...
        if (product.getBarcode() == null || product.getBarcode().trim().isEmpty()) {
            Integer maxPrefix = this.productRepository.findMaxNumericBarcodeByCompanyName(companyName);
            int base = (maxPrefix != null) ? maxPrefix : 999;
            if (base < 1000) base = 999;
            int next = base + 1; // -> first becomes 1000
            product.setBarcode(String.valueOf(next) + "A");
        } else {
            String raw = product.getBarcode().trim();
            // Normalize common inputs: if numeric-only, convert to numeric + 'A'
            if (raw.matches("^[0-9]+$")) {
                product.setBarcode(raw + "A");
            } else if (raw.matches("^[0-9]+a$")) {
                product.setBarcode(raw.substring(0, raw.length() - 1) + "A");
            } else {
                product.setBarcode(raw);
            }
        }

        // Product code is not used in UI; keep it consistent for DB/legacy usage
        if (product.getProductCode() == null || product.getProductCode().trim().isEmpty()) {
            product.setProductCode(product.getBarcode());
        } else {
            product.setProductCode(product.getProductCode().trim());
        }

        if (this.productRepository.findByCompanyNameAndBarcode(companyName, product.getBarcode()).isPresent()) {
            throw new RuntimeException("Product with barcode '" + product.getBarcode() + "' already exists");
        }

        if (product.getProductCode() != null && this.productRepository.findByCompanyNameAndProductCode(companyName, product.getProductCode()).isPresent()) {
            throw new RuntimeException("Product with product code '" + product.getProductCode() + "' already exists");
        }

        if (product.getCategory() != null && product.getCategory().getCategoryId() != null) {
            Category category = this.categoryRepository.findById(product.getCategory().getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category with ID " + product.getCategory().getCategoryId() + " not found"));
            product.setCategory(category);
        } else {
            product.setCategory(null);
        }

        // Persist unit exactly as sent from client (no default override)
        if (product.getUnit() != null) {
            product.setUnit(product.getUnit().trim());
        }

        return this.productRepository.save(product);
    }

    @Transactional
    public Product updateProduct(Integer id, Product product, String companyName) {
        Product existingProduct = this.productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!existingProduct.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Product not found or access denied");
        }

        // Barcode: if provided, validate uniqueness; else keep existing
        if (product.getBarcode() != null && !product.getBarcode().trim().isEmpty()) {
            String newBarcode = product.getBarcode().trim();
            if (!newBarcode.equals(existingProduct.getBarcode()) &&
                this.productRepository.findByCompanyNameAndBarcode(companyName, newBarcode).isPresent()) {
                throw new RuntimeException("Product with barcode '" + newBarcode + "' already exists");
            }
            existingProduct.setBarcode(newBarcode);
        }

        // Product code is not used; keep existing unless explicitly provided
        if (product.getProductCode() != null && !product.getProductCode().trim().isEmpty()) {
            String newCode = product.getProductCode().trim();
            if (!newCode.equals(existingProduct.getProductCode()) &&
                this.productRepository.findByCompanyNameAndProductCode(companyName, newCode).isPresent()) {
                throw new RuntimeException("Product with product code '" + newCode + "' already exists");
            }
            existingProduct.setProductCode(newCode);
        }

        existingProduct.setCompanyName(companyName);

        if (product.getCategory() != null && product.getCategory().getCategoryId() != null) {
            Category category = this.categoryRepository.findById(product.getCategory().getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category with ID " + product.getCategory().getCategoryId() + " not found"));
            existingProduct.setCategory(category);
        } else {
            existingProduct.setCategory(null);
        }

        existingProduct.setProductName(product.getProductName());
        existingProduct.setSellingPricePerUnit(product.getSellingPricePerUnit());
        existingProduct.setHsnCode(product.getHsnCode());
        existingProduct.setPackagingType(product.getPackagingType());
        // Only update unit when client sends it (non-null); persist exact value so "pcs" is not overwritten
        if (product.getUnit() != null) {
            existingProduct.setUnit(product.getUnit().trim());
        }
        existingProduct.setQuantity(product.getQuantity());
        existingProduct.setMinStockLevel(product.getMinStockLevel());
        existingProduct.setIsActive(product.getIsActive());

        return this.productRepository.save(existingProduct);
    }

    @Transactional
    public void deleteProduct(Integer id, String companyName) {
        Product product = this.productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Product not found or access denied");
        }

        List<InvoiceItem> invoiceItems = this.invoiceItemRepository.findByProduct_ProductId(id);
        if (!invoiceItems.isEmpty()) {
            throw new RuntimeException("Cannot delete product: It is referenced in " + invoiceItems.size() + " invoice item(s).");
        }

        try {
            this.productRepository.delete(product);
        } catch (DataIntegrityViolationException e) {
            throw new RuntimeException("Cannot delete product: Database constraint prevents deletion.");
        }
    }

    @Transactional
    public void updateStock(Integer productId, BigDecimal quantity, String companyName) {
        Product product = this.productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.getCompanyName().equals(companyName)) {
            throw new RuntimeException("Product not found or access denied");
        }

        product.setQuantity(quantity);
        this.productRepository.save(product);
    }
}
