package com.raosshub.service;

import com.raosshub.entity.Language;
import com.raosshub.entity.LocaleContent;
import com.raosshub.entity.UiMessage;
import com.raosshub.repository.LanguageRepository;
import com.raosshub.repository.LocaleContentRepository;
import com.raosshub.repository.UiMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class I18nService {

    private final LanguageRepository      languageRepository;
    private final UiMessageRepository     uiMessageRepository;
    private final LocaleContentRepository localeContentRepository;

    // ── Languages ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Language> getActiveLanguages() {
        return languageRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Language getDefaultLanguage() {
        return languageRepository.findByIsDefaultTrue()
            .orElseGet(() -> languageRepository.findByCode("en").orElse(null));
    }

    // ── UI strings ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, String> getUiStrings(String languageCode) {
        List<UiMessage> messages = uiMessageRepository.findByLanguageCode(languageCode);
        Map<String, String> result = new HashMap<>();
        for (UiMessage msg : messages) {
            result.put(msg.getKey(), msg.getValue());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Optional<UiMessage> getUiString(String key, String languageCode) {
        return uiMessageRepository.findByKeyAndLanguageCode(key, languageCode);
    }

    @Transactional
    public void saveUiString(String key, String languageCode, String value) {
        UiMessage message = uiMessageRepository.findByKeyAndLanguageCode(key, languageCode)
            .orElse(new UiMessage());
        message.setKey(key);
        message.setLanguageCode(languageCode);
        message.setValue(value);
        uiMessageRepository.save(message);
    }

    // ── Locale content ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LocaleContent> getLocaleContents(String languageCode) {
        return localeContentRepository.findByLanguageCode(languageCode);
    }

    @Transactional(readOnly = true)
    public Optional<LocaleContent> getLocaleContent(String languageCode, String sectionPath) {
        return localeContentRepository.findByLanguageCodeAndSectionPath(languageCode, sectionPath);
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> getLocaleContentMap(String languageCode, String sectionPath) {
        return getLocaleContent(languageCode, sectionPath)
            .map(lc -> {
                Map<String, Object> content = lc.getContent();
                return content != null ? content : new HashMap<>();
            });
    }

    /**
     * Returns all section paths that have content for a given language.
     * Used by Tab 2 AI Translation pre-flight check (GET /api/locales/{lang}/sections).
     * Returns plain strings — never objects — so the frontend can use them
     * directly as keys and URL path segments without any casting.
     */
    @Transactional(readOnly = true)
    public List<String> getSectionPaths(String languageCode) {
        return localeContentRepository.findByLanguageCode(languageCode)
            .stream()
            .map(LocaleContent::getSectionPath)
            .filter(p -> p != null && !p.isBlank())
            .sorted()
            .collect(Collectors.toList());
    }

    @Transactional
    public void saveLocaleContent(String languageCode, String sectionPath,
                                   Map<String, Object> content, String updatedBy) {
        LocaleContent lc = localeContentRepository
            .findByLanguageCodeAndSectionPath(languageCode, sectionPath)
            .orElse(new LocaleContent());
        lc.setLanguageCode(languageCode);
        lc.setSectionPath(sectionPath);
        lc.setContent(content != null ? content : new HashMap<>());
        lc.setUpdatedBy(updatedBy);
        localeContentRepository.save(lc);
    }

    // ── Full locale (nested by section path) ───────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getFullLocale(String languageCode) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<LocaleContent> contents = localeContentRepository.findByLanguageCode(languageCode);
        for (LocaleContent lc : contents) {
            Map<String, Object> content = lc.getContent();
            if (content != null) {
                setNestedValue(result, lc.getSectionPath(), content);
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private void setNestedValue(Map<String, Object> map, String path, Object value) {
        String[] parts = path.split("\\.");
        Map<String, Object> current = map;
        for (int i = 0; i < parts.length - 1; i++) {
            Object next = current.get(parts[i]);
            if (!(next instanceof Map)) {
                next = new LinkedHashMap<>();
                current.put(parts[i], next);
            }
            current = (Map<String, Object>) next;
        }
        current.put(parts[parts.length - 1], value);
    }
}
