package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * One row per user — the row is upserted (not appended) on each acceptance.
 * accepted_version stores the project identity version at time of acceptance.
 * Used by GET /api/auth/nda/status for version-enforcement checking.
 */
@Entity
@Table(name = "nda_agreements")
@Data
public class NdaAgreement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @CreationTimestamp
    private Instant agreedAt;

    @Column(length = 45)
    private String ipAddress;

    @Column(columnDefinition = "TEXT")
    private String userAgent;

    /** Project version (config.identity.version) at time of acceptance. */
    @Column(name = "accepted_version", length = 50)
    private String acceptedVersion;
}
