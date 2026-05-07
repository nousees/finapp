package com.finapp.services.exceptions;

import org.springframework.http.HttpStatus;
import java.util.Map;

public class ValidationException extends AppException {
    private final Map<String, String> errors;
    
    public ValidationException(String message, Map<String, String> errors) {
        super(message, HttpStatus.BAD_REQUEST, "VALIDATION_ERROR");
        this.errors = errors;
    }
    
    public Map<String, String> getErrors() {
        return errors;
    }
}
