package com.finapp.repositories.report;

import com.finapp.models.report.DashboardWidget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DashboardWidgetRepository extends JpaRepository<DashboardWidget, UUID> {
    
    List<DashboardWidget> findByUserId(UUID userId);
    
    List<DashboardWidget> findByUserIdAndIsVisibleTrue(UUID userId);
    
    Optional<DashboardWidget> findByIdAndUserId(UUID id, UUID userId);
    
    List<DashboardWidget> findByUserIdAndWidgetType(UUID userId, String widgetType);
    
    void deleteByUserId(UUID userId);
    
    List<DashboardWidget> findByUserIdOrderByPositionAsc(UUID userId);
    
    @Modifying
    @Transactional
    @Query("UPDATE DashboardWidget dw SET dw.position = :position " +
           "WHERE dw.id = :widgetId AND dw.userId = :userId")
    void updatePosition(
        @Param("widgetId") UUID widgetId,
        @Param("userId") UUID userId,
        @Param("position") Integer position
    );
    
    @Modifying
    @Transactional
    @Query("UPDATE DashboardWidget dw SET dw.isVisible = :isVisible " +
           "WHERE dw.id = :widgetId AND dw.userId = :userId")
    void updateVisibility(
        @Param("widgetId") UUID widgetId,
        @Param("userId") UUID userId,
        @Param("isVisible") Boolean isVisible
    );
}
