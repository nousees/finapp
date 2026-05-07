package com.finapp.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI finAppOpenApi() {
        return new OpenAPI()
            .info(new Info().title("FinApp Backend API").version("v1"))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .components(new Components().addSecuritySchemes(
                "bearerAuth",
                new SecurityScheme()
                    .name("bearerAuth")
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
            ));
    }

    @Bean
    public OpenApiCustomizer defaultResponsesOpenApiCustomizer() {
        return openApi -> {
            if (openApi.getPaths() == null) {
                return;
            }

            openApi.getPaths().forEach((path, pathItem) -> {
                for (Map.Entry<io.swagger.v3.oas.models.PathItem.HttpMethod, Operation> entry : pathItem.readOperationsMap().entrySet()) {
                    io.swagger.v3.oas.models.PathItem.HttpMethod method = entry.getKey();
                    Operation operation = entry.getValue();

                    if (operation.getResponses() == null) {
                        operation.setResponses(new io.swagger.v3.oas.models.responses.ApiResponses());
                    }

                    addIfMissing(operation, "401", "Unauthorized");
                    addIfMissing(operation, "403", "Forbidden");
                    addIfMissing(operation, "500", "Internal server error");

                    switch (method) {
                        case GET -> addIfMissing(operation, "200", "OK");
                        case POST -> {
                            addIfMissing(operation, "201", "Created");
                            addIfMissing(operation, "400", "Validation error");
                            addIfMissing(operation, "409", "Conflict");
                        }
                        case PUT, PATCH -> {
                            addIfMissing(operation, "200", "OK");
                            addIfMissing(operation, "400", "Validation error");
                            addIfMissing(operation, "409", "Conflict");
                        }
                        case DELETE -> addIfMissing(operation, "200", "OK");
                        default -> {
                        }
                    }
                }
            });
        };
    }

    private void addIfMissing(Operation operation, String code, String description) {
        if (!operation.getResponses().containsKey(code)) {
            operation.getResponses().addApiResponse(code, new ApiResponse().description(description));
        }
    }
}
