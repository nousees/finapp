package com.finapp.repositories.report;

import com.finapp.models.report.Report;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReportRepository extends JpaRepository<Report, UUID> {
    
    List<Report> findByUserId(UUID userId);
    
    List<Report> findByUserIdAndReportType(UUID userId, String reportType);
    
    Optional<Report> findByIdAndUserId(UUID id, UUID userId);
    
    Optional<Report> findByUserIdAndReportTypeAndPeriodStartAndPeriodEnd(
        UUID userId, String reportType, LocalDate periodStart, LocalDate periodEnd);
    
    List<Report> findByUserIdAndCreatedAtAfter(UUID userId, LocalDate date);
    
    @Query("SELECT r FROM Report r WHERE r.userId = :userId " +
           "AND r.reportType = :reportType " +
           "ORDER BY r.createdAt DESC LIMIT 1")
    Optional<Report> findLatestReportByType(
        @Param("userId") UUID userId,
        @Param("reportType") String reportType
    );
    
    @Query("DELETE FROM Report r WHERE r.userId = :userId " +
           "AND r.createdAt < :cutoffDate")
    void deleteOldReports(
        @Param("userId") UUID userId,
        @Param("cutoffDate") LocalDate cutoffDate
    );
}
