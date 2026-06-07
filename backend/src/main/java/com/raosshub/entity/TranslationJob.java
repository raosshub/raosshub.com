package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "translation_jobs")
@Data
public class TranslationJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 5, name = "source_lang")
    private String sourceLang;

    @Column(nullable = false, length = 5, name = "target_lang")
    private String targetLang;

    @Column(nullable = false, length = 200, name = "section_path")
    private String sectionPath;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    private Instant createdAt;
}
