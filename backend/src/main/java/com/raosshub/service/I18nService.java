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

    private final LanguageRepository       languageRepository;
    private final UiMessageRepository      uiMessageRepository;
    private final LocaleContentRepository  localeContentRepository;

    // ─── Language queries ──────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Language> getActiveLanguages() {
        return languageRepository.findByIsActiveTrue();
    }

    /** Returns all languages including inactive. Used by Admin Setup Tab 2. */
    @Transactional(readOnly = true)
    public List<Language> getAllLanguages() {
        return languageRepository.findAll().stream()
            .sorted(Comparator.comparing(l -> "en".equals(l.getCode()) ? "0" : l.getName()))
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Language getDefaultLanguage() {
        return languageRepository.findByIsDefaultTrue()
            .orElseGet(() -> languageRepository.findByCode("en").orElse(null));
    }

    // ─── Language management ───────────────────────────────────────────────────

    /**
     * Creates a new language. The new language starts as inactive —
     * it becomes visible to users only after content has been translated and
     * the admin explicitly activates it.
     */
    @Transactional
    public Language createLanguage(String code, String name, String nameNative, boolean isRtl) {
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Language code is required");
        }
        if (languageRepository.findByCode(code.trim().toLowerCase()).isPresent()) {
            throw new IllegalArgumentException("Language code already exists: " + code);
        }
        Language lang = new Language();
        lang.setCode(code.trim().toLowerCase());
        lang.setName(name != null ? name.trim() : code);
        lang.setNameNative(nameNative != null ? nameNative.trim() : name);
        lang.setIsRtl(isRtl);
        lang.setIsActive(false);   // inactive until translated + manually activated
        lang.setIsDefault(false);
        log.info("[I18n] Language created: {} ({})", lang.getName(), lang.getCode());
        return languageRepository.save(lang);
    }

    /**
     * Updates language metadata. English cannot be deactivated — it is the
     * system fallback for all missing UI string keys.
     */
    @Transactional
    public Language updateLanguage(Integer id, Map<String, Object> updates) {
        Language lang = languageRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Language not found: " + id));

        // EN protection — cannot deactivate the fallback language
        if ("en".equals(lang.getCode())) {
            Object isActive = updates.get("isActive");
            if (Boolean.FALSE.equals(isActive)) {
                throw new IllegalStateException(
                    "English cannot be deactivated — it is the system fallback for all missing keys"
                );
            }
        }

        if (updates.containsKey("name")) {
            lang.setName(((String) updates.get("name")).trim());
        }
        if (updates.containsKey("nameNative")) {
            lang.setNameNative(((String) updates.get("nameNative")).trim());
        }
        if (updates.containsKey("isRtl")) {
            lang.setIsRtl((Boolean) updates.get("isRtl"));
        }
        if (updates.containsKey("isActive")) {
            lang.setIsActive((Boolean) updates.get("isActive"));
        }

        log.info("[I18n] Language updated: {} ({})", lang.getName(), lang.getCode());
        return languageRepository.save(lang);
    }

    /**
     * Sets a language as the default. Clears the previous default first.
     * Only one language can be the default at a time.
     */
    @Transactional
    public void setDefaultLanguage(Integer id) {
        Language target = languageRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Language not found: " + id));

        if (!target.getIsActive()) {
            throw new IllegalStateException(
                "Cannot set an inactive language as default. Activate it first."
            );
        }

        // Clear existing default
        languageRepository.findByIsDefaultTrue().ifPresent(prev -> {
            if (!prev.getId().equals(id)) {
                prev.setIsDefault(false);
                languageRepository.save(prev);
            }
        });

        target.setIsDefault(true);
        languageRepository.save(target);
        log.info("[I18n] Default language set to: {} ({})", target.getName(), target.getCode());
    }

    // ─── UI strings ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, String> getUiStrings(String languageCode) {
        List<UiMessage> messages = uiMessageRepository.findByLanguageCode(languageCode);
        Map<String, String> result = new HashMap<>();

        // If no strings exist for requested language, fall back to English
        if (messages.isEmpty() && !"en".equals(languageCode)) {
            messages = uiMessageRepository.findByLanguageCode("en");
        }

        for (UiMessage msg : messages) {
            result.put(msg.getKey(), msg.getValue());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public Optional<UiMessage> getUiString(String key, String languageCode) {
        Optional<UiMessage> msg = uiMessageRepository.findByKeyAndLanguageCode(key, languageCode);
        if (msg.isEmpty() && !"en".equals(languageCode)) {
            msg = uiMessageRepository.findByKeyAndLanguageCode(key, "en");
        }
        return msg;
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

    // ─── Locale content ────────────────────────────────────────────────────────

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
                return content != null ? content : new HashMap<String, Object>();
            });
    }

    /**
     * Returns all locale content for a language as a flat list of
     * {sectionPath, content} records — used by the Kimi translation runner
     * in Admin Setup Tab 2 to iterate all sections for translation.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getLocaleSections(String languageCode) {
        return localeContentRepository.findByLanguageCode(languageCode).stream()
            .map(lc -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("sectionPath", lc.getSectionPath());
                item.put("content", lc.getContent() != null ? lc.getContent() : new HashMap<>());
                return item;
            })
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

    @Transactional(readOnly = true)
    public Map<String, Object> getFullLocale(String languageCode) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<LocaleContent> contents = localeContentRepository.findByLanguageCode(languageCode);
        for (LocaleContent lc : contents) {
            Map<String, Object> content = lc.getContent();
            if (content != null) setNestedValue(result, lc.getSectionPath(), content);
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
