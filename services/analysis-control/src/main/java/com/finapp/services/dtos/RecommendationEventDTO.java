package com.finapp.services.dtos;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RecommendationEventDTO {

    @NotBlank
    private String eventType;
}
