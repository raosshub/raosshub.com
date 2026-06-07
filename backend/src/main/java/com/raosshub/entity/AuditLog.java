package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "audit_log")
@Data
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(length = 100)
    private String username;

    @Column(nullable = false, length = 50)
    private String action;

    @Column(nullable = false, length = 50)
    private String resource;

    @Column(name = "record_id")
    private Long recordId;

    @Column(name = "detail_en", columnDefinition = "TEXT")
    private String detailEn;

    @Column(name = "detail_zh", columnDefinition = "TEXT")
    private String detailZh;

    @Column(length = 45, name = "ip_address")
    private String ipAddress;

    @Column(columnDefinition = "TEXT", name = "user_agent")
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at")
    private Instant createdAt;
}
