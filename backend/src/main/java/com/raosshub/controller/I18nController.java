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
        Map<String, Object> locale = i18nService.getFullLocale(lang);
        return ResponseEntity.ok(ApiResponse.ok(locale));
    }

    @GetMapping("/locales/{lang}/{sectionPath:.+}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLocaleSection(
            @PathVariable String lang,
            @PathVariable String sectionPath) {
        Map<String, Object> content = i18nService.getLocaleContentMap(lang, sectionPath).orElse(null);
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

    @PostMapping("/ui-strings")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
    public ResponseEntity<ApiResponse<Void>> saveUiString(
            @RequestBody Map<String, String> body) {
        String key = body.get("key");
        String languageCode = body.get("languageCode");
        String value = body.get("value");
        i18nService.saveUiString(key, languageCode, value);
        return ResponseEntity.ok(ApiResponse.ok(null, "UI string saved"));
    }
}
