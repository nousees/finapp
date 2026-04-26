// backend-java/src/main/java/com/finapp/controllers/TestController.java
package com.finapp.controllers;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/health")
    public String health() {
        return "Java backend is running!";
    }

    @GetMapping("/db-check")
    @PreAuthorize("isAuthenticated()")
    public String dbCheck() {
        return "Database connection: OK (port 5433)";
    }
}
