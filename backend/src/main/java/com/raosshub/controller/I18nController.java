package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.entity.Language;
import com.raosshub.entity.UiMessage;
import com.raosshub.service.I18nService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class I18nController {

    private final I18nService i18nService;

    // ─── Languages (public) ────────────────────────────────────────────────────
    // Returns active languages only — used by all clients including login screen.
    // This exact path is public; /languages/** requires authentication.

    @GetMapping("/languages")
    public ResponseEntity<ApiResponse<List<Language>>> getLanguages() {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getActiveLanguages()));
    }

    // ─── Language management (superadmin) ─────────────────────────────────────
    // Returns ALL languages including inactive. Used by Admin Setup Tab 2.

    @GetMapping("/languages/all")
    @PreAuthorize("hasAnyRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<List<Language>>> getAllLanguages() {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getAllLanguages()));
    }

    @PostMapping("/languages")
    @PreAuthorize("hasAnyRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Language>> createLanguage(
            @RequestBody Map<String, Object> body) {
        String code       = (String)  body.get("code");
        String name       = (String)  body.get("name");
        String nameNative = (String)  body.get("nameNative");
        Boolean isRtl     = (Boolean) body.getOrDefault("isRtl", false);
        Language lang = i18nService.createLanguage(code, name, nameNative, isRtl);
        return ResponseEntity.ok(ApiResponse.ok(lang, "Language created"));
    }

    @PutMapping("/languages/{id}")
    @PreAuthorize("hasAnyRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Language>> updateLanguage(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> body) {
        Language lang = i18nService.updateLanguage(id, body);
        return ResponseEntity.ok(ApiResponse.ok(lang, "Language updated"));
    }

    @PatchMapping("/languages/{id}/default")
    @PreAuthorize("hasAnyRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> setDefaultLanguage(@PathVariable Integer id) {
        i18nService.setDefaultLanguage(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "Default language updated"));
    }

    // ─── UI strings ────────────────────────────────────────────────────────────

    @GetMapping("/ui-strings")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUiStrings(
            @RequestParam(defaultValue = "en") String lang) {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getUiStrings(lang)));
    }

    @PostMapping("/ui-strings")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> saveUiString(
            @RequestBody Map<String, String> body) {
        String key          = body.get("key");
        String languageCode = body.get("languageCode");
        String value        = body.get("value");
        i18nService.saveUiString(key, languageCode, value);
        return ResponseEntity.ok(ApiResponse.ok(null, "UI string saved"));
    }

    // ─── Locale content ────────────────────────────────────────────────────────

    @GetMapping("/locales/{lang}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLocale(@PathVariable String lang) {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getFullLocale(lang)));
    }

    /**
     * Returns locale content as a flat list of {sectionPath, content} records.
     * Used by Admin Setup Tab 2 (Kimi translation) to iterate all sections.
     * This exact path takes priority over the {sectionPath:.+} wildcard below.
     */
    @GetMapping("/locales/{lang}/sections")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getLocaleSections(
            @PathVariable String lang) {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getLocaleSections(lang)));
    }

    @GetMapping("/locales/{lang}/{sectionPath:.+}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLocaleSection(
            @PathVariable String lang,
            @PathVariable String sectionPath) {
        Map<String, Object> content =
            i18nService.getLocaleContentMap(lang, sectionPath).orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(content));
    }

    @PostMapping("/locales/{lang}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> saveLocaleContent(
            @PathVariable String lang,
            @RequestBody Map<String, Object> body) {
        String sectionPath = (String) body.get("sectionPath");
        @SuppressWarnings("unchecked")
        Map<String, Object> content = (Map<String, Object>) body.get("content");
        String updatedBy = (String) body.getOrDefault("updatedBy", "system");
        i18nService.saveLocaleContent(lang, sectionPath, content, updatedBy);
        return ResponseEntity.ok(ApiResponse.ok(null, "Locale content saved"));
    }
}
