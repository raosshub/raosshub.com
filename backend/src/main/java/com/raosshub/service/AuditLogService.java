package com.raosshub.service;

import com.raosshub.entity.AuditLog;
import com.raosshub.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional
    public void log(String username, String action, String resource, Long recordId,
                    String detail, String ipAddress) {
        try {
            AuditLog log = new AuditLog();
            log.setUsername(username);
            log.setAction(action);
            log.setResource(resource);
            log.setRecordId(recordId);
            log.setDetailEn(detail);
            log.setIpAddress(ipAddress);
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Never fail the main operation due to audit logging
        }
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getAuditLogs(String action, Instant fromDate, Instant toDate, Pageable pageable) {
        return auditLogRepository.findByFilters(action, fromDate, toDate, pageable);
    }
}
