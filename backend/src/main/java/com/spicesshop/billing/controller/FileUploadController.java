package com.spicesshop.billing.controller;

import com.spicesshop.billing.service.FileUploadService;
import java.io.IOException;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping({"/api/upload"})
@CrossOrigin(origins = {"*"})
public class FileUploadController {

    @Autowired
    private FileUploadService fileUploadService;

    @PostMapping({"/employee-photo"})
    public ResponseEntity<?> uploadEmployeePhoto(@RequestParam("file") MultipartFile file) {
        try {
            String filePath = this.fileUploadService.uploadEmployeePhoto(file);
            return ResponseEntity.ok(Map.of("url", filePath));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload photo: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping({"/employee-aadhar"})
    public ResponseEntity<?> uploadAadharDocument(@RequestParam("file") MultipartFile file) {
        try {
            String filePath = this.fileUploadService.uploadAadharDocument(file);
            return ResponseEntity.ok(Map.of("url", filePath));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "Failed to upload document: " + e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
