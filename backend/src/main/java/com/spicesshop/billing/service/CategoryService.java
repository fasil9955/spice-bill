package com.spicesshop.billing.service;

import com.spicesshop.billing.model.Category;
import com.spicesshop.billing.repository.CategoryRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    public List<Category> getAllCategories() {
        return this.categoryRepository.findAll();
    }

    public Optional<Category> getCategoryById(Integer id) {
        return this.categoryRepository.findById(id);
    }

    public Category createCategory(Category category) {
        if (this.categoryRepository.existsByCategoryName(category.getCategoryName())) {
            throw new RuntimeException("Category name already exists: " + category.getCategoryName());
        }
        return this.categoryRepository.save(category);
    }

    public Category updateCategory(Integer id, Category category) {
        Optional<Category> existingOpt = this.categoryRepository.findById(id);
        if (existingOpt.isEmpty()) {
            throw new RuntimeException("Category not found");
        }

        Category existing = existingOpt.get();
        if (!existing.getCategoryName().equals(category.getCategoryName()) && 
            this.categoryRepository.existsByCategoryName(category.getCategoryName())) {
            throw new RuntimeException("Category name already exists: " + category.getCategoryName());
        }

        existing.setCategoryName(category.getCategoryName());
        existing.setDescription(category.getDescription());
        existing.setGstPercentage(category.getGstPercentage());

        return this.categoryRepository.save(existing);
    }

    public void deleteCategory(Integer id) {
        this.categoryRepository.deleteById(id);
    }
}
