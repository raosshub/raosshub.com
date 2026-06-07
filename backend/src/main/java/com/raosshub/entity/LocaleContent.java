package com.raosshub.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;

@Entity
@Table(name = "locale_content", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"language_code", "section_path"})
})
@Data
public class LocaleContent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 5, name = "language_code")
    private String languageCode;

    @Column(nullable = false, length = 200)
    private String sectionPath;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> content;

    @UpdateTimestamp
    private Instant updatedAt;

    @Column(length = 100)
    private String updatedBy;
}
