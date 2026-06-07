package com.raosshub.service;

import com.raosshub.entity.Language;
import com.raosshub.entity.LocaleContent;
import com.raosshub.entity.UiMessage;
import com.raosshub.repository.LanguageRepository;
import com.raosshub.repository.LocaleContentRepository;
import com.raosshub.repository.UiMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class I18nService {

    private final LanguageRepository languageRepository;
    private final UiMessageRepository uiMessageRepository;
    private final LocaleContentRepository localeContentRepository;

    @Transactional(readOnly = true)
    public List<Language> getActiveLanguages() {
        return languageRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Language getDefaultLanguage() {
        return languageRepository.findByIsDefaultTrue()
            .orElseGet(() -> languageRepository.findByCode("en").orElse(null));
    }

    @Transactional(readOnly = true)
    public Map<String, String> getUiStrings(String languageCode) {
        List<UiMessage> messages = uiMessageRepository.findByLanguageCode(languageCode);
        Map<String, String> result = new HashMap<>();

        // If requested language has no messages, fall back to English
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

    @Transactional(readOnly = true)
    public List<LocaleContent> getLocaleContents(String languageCode) {
        return localeContentRepository.findByLanguageCode(languageCode);
    }

    @Transactional(readOnly = true)
    public Optional<LocaleContent> getLocaleContent(String languageCode, String sectionPath) {
        return localeContentRepository.findByLanguageCodeAndSectionPath(languageCode, sectionPath);
    }

    @Transactional
    public void saveLocaleContent(String languageCode, String sectionPath, Object content, String updatedBy) {
        LocaleContent lc = localeContentRepository.findByLanguageCodeAndSectionPath(languageCode, sectionPath)
            .orElse(new LocaleContent());
        lc.setLanguageCode(languageCode);
        lc.setSectionPath(sectionPath);
        lc.setContent(content);
        lc.setUpdatedBy(updatedBy);
        localeContentRepository.save(lc);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getFullLocale(String languageCode) {
        Map<String, Object> result = new LinkedHashMap<>();
        List<LocaleContent> contents = localeContentRepository.findByLanguageCode(languageCode);

        for (LocaleContent lc : contents) {
            setNestedValue(result, lc.getSectionPath(), lc.getContent());
        }

        return result;
    }

    @SuppressWarnings("unchecked")
    private void setNestedValue(Map<String, Object> map, String path, Object value) {
        String[] parts = path.split("\\.");
        Map<String, Object> current = map;
        for (int i = 0; i < parts.length - 1; i++) {
            current = (Map<String, Object>) current.computeIfAbsent(parts[i], k -> new LinkedHashMap<>());
        }
        current.put(parts[parts.length - 1], value);
    }
}
