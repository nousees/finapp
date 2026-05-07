package com.finapp.services.exceptions;

import org.springframework.http.HttpStatus;

public class NotFoundException extends AppException {
    public NotFoundException(String message) {
        super(message, HttpStatus.NOT_FOUND, "NOT_FOUND");
    }
    
    public NotFoundException(String entity, Object id) {
        super(String.format("%s with ID %s not found", entity, id), 
              HttpStatus.NOT_FOUND, "NOT_FOUND");
    }
}