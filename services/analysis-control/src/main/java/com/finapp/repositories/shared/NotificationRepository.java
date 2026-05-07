package com.finapp.repositories.shared;

import com.finapp.models.shared.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    
    List<Notification> findByUserId(UUID userId);
    
    Page<Notification> findByUserId(UUID userId, Pageable pageable);
    
    List<Notification> findByUserIdAndIsReadFalse(UUID userId);
    
    List<Notification> findByUserIdAndType(UUID userId, String type);
    
    List<Notification> findByUserIdAndSourceModule(UUID userId, String sourceModule);
    
    List<Notification> findByUserIdAndCreatedAtAfter(UUID userId, OffsetDateTime date);
    
    @Query("SELECT n FROM Notification n WHERE n.userId = :userId " +
           "AND n.scheduledFor IS NOT NULL " +
           "AND n.scheduledFor <= :now " +
           "AND n.isRead = false")
    List<Notification> findScheduledNotifications(
        @Param("userId") UUID userId,
        @Param("now") OffsetDateTime now
    );
    
    @Modifying
    @Transactional
    @Query("UPDATE Notification n SET n.isRead = true " +
           "WHERE n.id IN :ids AND n.userId = :userId")
    void markAsRead(@Param("ids") List<UUID> ids, @Param("userId") UUID userId);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM Notification n WHERE n.userId = :userId " +
           "AND n.isRead = true " +
           "AND n.createdAt < :cutoffDate")
    void deleteOldReadNotifications(
        @Param("userId") UUID userId,
        @Param("cutoffDate") OffsetDateTime cutoffDate
    );
    
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.userId = :userId AND n.isRead = false")
    Long countUnreadNotifications(@Param("userId") UUID userId);
}
