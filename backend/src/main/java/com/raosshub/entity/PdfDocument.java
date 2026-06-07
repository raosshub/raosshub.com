package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "pdf_documents")
@Data
public class PdfDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, name = "team_id")
    private String teamId;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(length = 500, name = "file_name")
    private String fileName;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(length = 100, name = "mime_type")
    private String mimeType;

    @Column(length = 500, name = "s3_key")
    private String s3Key;

    @Column(length = 100, name = "s3_bucket")
    private String s3Bucket;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreationTimestamp
    private Instant createdAt;

    @Column(length = 100, name = "created_by")
    private String createdBy;
}
