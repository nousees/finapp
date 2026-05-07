package com.finapp.services;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
public abstract class BaseService<T, D> {
    
    protected void validateUserId(UUID userId, UUID entityUserId) {
        if (!userId.equals(entityUserId)) {
            throw new RuntimeException("Access denied");
        }
    }
    
    protected Page<D> toPageDTO(Page<T> page, Function<T, D> converter) {
        return page.map(converter);
    }
    
    protected List<D> toListDTO(List<T> list, Function<T, D> converter) {
        return list.stream()
            .map(converter)
            .collect(Collectors.toList());
    }
}