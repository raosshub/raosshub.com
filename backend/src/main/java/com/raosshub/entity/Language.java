package com.raosshub.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Lombok generates isRtl(), isActive(), isDefault() getters for Boolean fields.
 * Jackson strips the "is" prefix from Boolean getter names and would serialize
 * them as "rtl", "active", "default" — breaking the TypeScript Language interface
 * which expects "isRtl", "isActive", "isDefault".
 *
 * @JsonProperty forces the exact JSON key names regardless of getter name.
 */
@Entity
@Table(name = "languages")
@Data
public class Language {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false, length = 5)
    private String code;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(nullable = false, length = 50)
    private String nameNative;

    @JsonProperty("isRtl")
    @Column(nullable = false)
    private Boolean isRtl = false;

    @JsonProperty("isActive")
    @Column(nullable = false)
    private Boolean isActive = true;

    @JsonProperty("isDefault")
    @Column(nullable = false)
    private Boolean isDefault = false;

    @CreationTimestamp
    private Instant createdAt;
}
