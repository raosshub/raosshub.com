package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "pdf_versions")
@Data
public class PdfVersion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private PdfDocument document;

    @Column(nullable = false, length = 50)
    private String version;

    @Column(length = 500, name = "s3_key")
    private String s3Key;

    @Column(length = 100, name = "s3_bucket")
    private String s3Bucket;

    @Column(name = "raw_text", columnDefinition = "TEXT")
    private String rawText;

    @Column(name = "was_translated")
    private Boolean wasTranslated = false;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> currentSections;

    @CreationTimestamp
    private Instant createdAt;

    @Column(length = 100, name = "created_by")
    private String createdBy;
}
