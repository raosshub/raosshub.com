package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "team_files")
@Data
public class TeamFile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, name = "team_id")
    private String teamId;

    @Column(nullable = false, length = 500, name = "file_name")
    private String fileName;

    @Column(length = 500, name = "s3_key")
    private String s3Key;

    @Column(length = 100, name = "s3_bucket")
    private String s3Bucket;

    @Column(length = 1000, name = "s3_url")
    private String s3Url;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(length = 100, name = "mime_type")
    private String mimeType;

    @Column(length = 100, name = "uploaded_by")
    private String uploadedBy;

    @CreationTimestamp
    private Instant createdAt;
}
