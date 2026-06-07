package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "ui_messages", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"key", "language_code"})
})
@Data
public class UiMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String key;

    @Column(nullable = false, length = 5, name = "language_code")
    private String languageCode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String value;

    @UpdateTimestamp
    private Instant updatedAt;
}
