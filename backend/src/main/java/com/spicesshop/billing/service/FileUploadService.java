package com.spicesshop.billing.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileUploadService {

    @Value("${file.upload.dir:uploads}")
    private String uploadDir;

    private static final String EMPLOYEE_PHOTOS_DIR = "employee-photos";
    private static final String EMPLOYEE_AADHAR_DIR = "employee-aadhar";

    public String uploadEmployeePhoto(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or null");
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("File must be an image");
        }

        if (file.getSize() > 5242880L) {
            throw new IllegalArgumentException("File size must be less than 5MB");
        }

        Path uploadPath = Paths.get(this.uploadDir, EMPLOYEE_PHOTOS_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        String filename = UUID.randomUUID().toString() + extension;

        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return EMPLOYEE_PHOTOS_DIR + "/" + filename;
    }

    public String uploadAadharDocument(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or null");
        }

        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf(".")).toLowerCase();
        }

        boolean isValidType = false;
        if (contentType != null) {
            isValidType = (contentType.equals("application/pdf") || contentType.equals("image/jpeg") || contentType.equals("image/jpg"));
        }
        if (!isValidType && (extension.equals(".pdf") || extension.equals(".jpg") || extension.equals(".jpeg"))) {
            isValidType = true;
        }

        if (!isValidType) {
            throw new IllegalArgumentException("File must be a PDF or JPG image");
        }

        if (file.getSize() > 10485760L) {
            throw new IllegalArgumentException("File size must be less than 10MB");
        }

        Path uploadPath = Paths.get(this.uploadDir, EMPLOYEE_AADHAR_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        if (extension.isEmpty()) {
            extension = (contentType != null && contentType.equals("application/pdf")) ? ".pdf" : ".jpg";
        }
        String filename = UUID.randomUUID().toString() + extension;

        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return EMPLOYEE_AADHAR_DIR + "/" + filename;
    }

    public boolean deleteEmployeePhoto(String photoPath) {
        if (photoPath == null || photoPath.isEmpty()) {
            return false;
        }

        try {
            Path filePath = Paths.get(this.uploadDir, photoPath);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                return true;
            }
        } catch (IOException e) {
            System.err.println("Error deleting photo: " + e.getMessage());
        }
        return false;
    }

    public boolean deleteAadharDocument(String documentPath) {
        if (documentPath == null || documentPath.isEmpty()) {
            return false;
        }

        try {
            Path filePath = Paths.get(this.uploadDir, documentPath);
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                return true;
            }
        } catch (IOException e) {
            System.err.println("Error deleting Aadhar document: " + e.getMessage());
        }
        return false;
    }

    public Path getPhotoPath(String photoPath) {
        if (photoPath == null || photoPath.isEmpty()) {
            return null;
        }
        return Paths.get(this.uploadDir, photoPath);
    }
}
