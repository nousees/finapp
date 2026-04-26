// backend-java/src/main/java/com/finapp/config/converters/JsonbListConverter.java
package com.finapp.config.converters;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.SneakyThrows;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Converter(autoApply = true)  // Изменили на autoApply
@Component
public class JsonbListConverter implements AttributeConverter<List<Integer>, String> {
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    @SneakyThrows
    public String convertToDatabaseColumn(List<Integer> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return null;  // ИЗМЕНИТЕ: возвращаем null, а не "[]"
        }
        return objectMapper.writeValueAsString(attribute);
    }
    
    @Override
    @SneakyThrows
    public List<Integer> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return Collections.emptyList();
        }
        return objectMapper.readValue(dbData, new TypeReference<List<Integer>>() {});
    }
}