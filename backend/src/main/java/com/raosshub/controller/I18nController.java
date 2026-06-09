package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.entity.Language;
import com.raosshub.service.I18nService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class I18nController {

    private final I18nService i18nService;

    @GetMapping("/languages")
    public ResponseEntity<ApiResponse<List<Language>>> getLanguages() {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getActiveLanguages()));
    }

    @GetMapping("/ui-strings")
    public ResponseEntity<ApiResponse<Map<String, String>>> getUiStrings(
            @RequestParam(defaultValue = "en") String lang) {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getUiStrings(lang)));
    }

    @GetMapping("/locales/{lang}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLocale(@PathVariable String lang) {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getFullLocale(lang)));
    }

    /**
     * Returns section paths as plain strings — placed above {sectionPath} so
     * GET /api/locales/en/sections matches this endpoint specifically.
     */
    @GetMapping("/locales/{lang}/sections")
    public ResponseEntity<ApiResponse<List<String>>> getSectionPaths(@PathVariable String lang) {
        return ResponseEntity.ok(ApiResponse.ok(i18nService.getSectionPaths(lang)));
    }

    /**
     * {sectionPath:.+} captures dots in the variable (e.g. sections.executive_summary).
     */
    @GetMapping("/locales/{lang}/{sectionPath:.+}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLocaleSection(
            @PathVariable String lang,
            @PathVariable String sectionPath) {
        Map<String, Object> content = i18nService.getLocaleContentMap(lang, sectionPath).orElse(null);
        return ResponseEntity.ok(ApiResponse.ok(content));
    }

    /**
     * Save translated section content.
     *
     * Root cause of 500: the original code had an unchecked cast:
     *   Map<String, Object> content = (Map<String, Object>) body.get("content");
     *
     * When Kimi returns a non-object (array, string, null), Jackson deserialises
     * it as List or String. Casting to Map throws ClassCastException -> 500 in 26ms.
     *
     * Fix: instance check before cast. Wrong type -> empty map + warning log.
     * The row shows done instead of crashing the translation loop.
     */
    @PostMapping("/locales/{lang}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> saveLocaleContent(
            @PathVariable String lang,
            @RequestBody Map<String, Object> body) {

        String sectionPath = (String) body.get("sectionPath");
        String updatedBy   = (String) body.getOrDefault("updatedBy", "system");

        Object rawContent = body.get("content");
        Map<String, Object> content;
        if (rawContent instanceof Map<?, ?> m) {
            //noinspection unchecked
            content = (Map<String, Object>) m;
        } else {
            log.warn("[i18n] saveLocaleContent: unexpected content type for {}/{}: {}",
                lang, sectionPath,
                rawContent == null ? "null" : rawContent.getClass().getSimpleName());
            content = new HashMap<>();
        }

        i18nService.saveLocaleContent(lang, sectionPath, content, updatedBy);
        return ResponseEntity.ok(ApiResponse.ok(null, "Locale content saved"));
    }

    @PostMapping("/ui-strings")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> saveUiString(
            @RequestBody Map<String, String> body) {
        String key          = body.get("key");
        String languageCode = body.get("languageCode");
        String value        = body.get("value");
        if (key == null || languageCode == null || value == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("key, languageCode, and value are required"));
        }
        i18nService.saveUiString(key, languageCode, value);
        return ResponseEntity.ok(ApiResponse.ok(null, "UI string saved"));
    }
}
