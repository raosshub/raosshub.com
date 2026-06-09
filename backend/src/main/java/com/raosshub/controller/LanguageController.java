package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.entity.Language;
import com.raosshub.repository.LanguageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin language management endpoints for Admin Setup → Language & Translation (Tab 2).
 *
 * The public endpoint GET /api/languages (active languages only) remains in I18nController.
 * This controller handles the admin-only CRUD operations that require SUPERADMIN role.
 *
 * Endpoints:
 *   GET    /api/languages/all       → all languages incl. inactive (Tab 2 list)
 *   POST   /api/languages           → create new language
 *   PUT    /api/languages/{id}      → update name, nativeName, isRtl, isActive
 *   PATCH  /api/languages/{id}/default → set as default (unsets previous default first)
 */
@Slf4j
@RestController
@RequestMapping("/api/languages")
@RequiredArgsConstructor
public class LanguageController {

    private final LanguageRepository languageRepository;

    // ── GET /api/languages/all ─────────────────────────────────────────────────
    // Returns ALL languages (active + inactive), sorted by creation order.
    // Used by Tab 2 to show the full language management list.
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ApiResponse<List<Language>>> getAllLanguages() {
        List<Language> langs = languageRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));
        return ResponseEntity.ok(ApiResponse.ok(langs));
    }

    // ── POST /api/languages ────────────────────────────────────────────────────
    // Create a new language.
    // Body: { code: "fr", name: "French", nameNative: "Français", isRtl: false }
    @PostMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Language>> createLanguage(
            @RequestBody Map<String, Object> body) {

        Object codeObj = body.get("code");
        if (codeObj == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Language code is required"));
        }
        String code = codeObj.toString().toLowerCase().trim();

        if (languageRepository.findByCode(code).isPresent()) {
            return ResponseEntity.badRequest()
                .body(ApiResponse.error("Language code already exists: " + code));
        }

        Language lang = new Language();
        lang.setCode(code);
        lang.setName((String) body.getOrDefault("name", code));
        lang.setNameNative((String) body.getOrDefault("nameNative", code));
        lang.setIsRtl(Boolean.TRUE.equals(body.get("isRtl")));
        lang.setIsActive(true);
        lang.setIsDefault(false);

        Language saved = languageRepository.save(lang);
        log.info("[Language] Created: {} ({})", saved.getName(), saved.getCode());
        return ResponseEntity.ok(ApiResponse.ok(saved, "Language created"));
    }

    // ── PUT /api/languages/{id} ────────────────────────────────────────────────
    // Update any subset of: name, nameNative, isRtl, isActive.
    // isDefault is NOT updatable here — use PATCH /{id}/default instead.
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Language>> updateLanguage(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {

        Language lang = languageRepository.findById(id).orElse(null);
        if (lang == null) {
            return ResponseEntity.notFound().build();
        }

        if (body.containsKey("name"))       lang.setName((String) body.get("name"));
        if (body.containsKey("nameNative")) lang.setNameNative((String) body.get("nameNative"));
        if (body.containsKey("isRtl"))      lang.setIsRtl(Boolean.TRUE.equals(body.get("isRtl")));
        if (body.containsKey("isActive")) {
            boolean active = Boolean.TRUE.equals(body.get("isActive"));
            // Cannot deactivate the default language
            if (!active && Boolean.TRUE.equals(lang.getIsDefault())) {
                return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Cannot deactivate the default language"));
            }
            lang.setIsActive(active);
        }

        return ResponseEntity.ok(ApiResponse.ok(languageRepository.save(lang), "Language updated"));
    }

    // ── PATCH /api/languages/{id}/default ────────────────────────────────────
    // Set a language as the system default.
    // Steps: (1) clear current default flag, (2) set new default + force active.
    // Wrapped in a transaction so both steps succeed or both fail.
    @PatchMapping("/{id}/default")
    @PreAuthorize("hasRole('SUPERADMIN')")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> setDefault(@PathVariable Integer id) {
        Language newDefault = languageRepository.findById(id).orElse(null);
        if (newDefault == null) {
            return ResponseEntity.notFound().build();
        }

        // Clear current default on all languages
        languageRepository.findAll().forEach(l -> {
            if (Boolean.TRUE.equals(l.getIsDefault()) && !l.getId().equals(id)) {
                l.setIsDefault(false);
                languageRepository.save(l);
            }
        });

        // Set new default (must also be active)
        newDefault.setIsDefault(true);
        newDefault.setIsActive(true);
        languageRepository.save(newDefault);

        log.info("[Language] Default set to {} ({})", newDefault.getName(), newDefault.getCode());
        return ResponseEntity.ok(ApiResponse.ok(null, "Default language updated"));
    }
}
