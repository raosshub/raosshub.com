package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "chat_summaries")
@Data
public class ChatSummary {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50, name = "team_id")
    private String teamId;

    @Column(length = 500)
    private String title;

    @Column(name = "summary_text", columnDefinition = "TEXT")
    private String summaryText;

    @Column(columnDefinition = "TEXT[] DEFAULT '{}'")
    private String[] decisions;

    @Column(columnDefinition = "TEXT[] DEFAULT '{}'")
    private String[] actions;

    @Column(columnDefinition = "TEXT[] DEFAULT '{}'")
    private String[] blockers;

    @Column(name = "analysed_by_insight")
    private Boolean analysedByInsight = false;

    @CreationTimestamp
    private Instant createdAt;

    @UpdateTimestamp
    private Instant updatedAt;
}
