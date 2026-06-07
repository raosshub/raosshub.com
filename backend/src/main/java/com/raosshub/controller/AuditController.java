package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.entity.AuditLog;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
public class AuditController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        Instant fromDate = null;
        Instant toDate = null;

        if (from != null && !from.isEmpty()) {
            fromDate = LocalDate.parse(from).atStartOfDay(ZoneOffset.UTC).toInstant();
        }
        if (to != null && !to.isEmpty()) {
            toDate = LocalDate.parse(to).atTime(23, 59, 59).toInstant(ZoneOffset.UTC);
        }

        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<AuditLog> logs = auditLogService.getAuditLogs(action, fromDate, toDate, pageable);
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}
