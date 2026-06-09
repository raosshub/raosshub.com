package com.raosshub.service;

import com.raosshub.config.AppProperties;
import com.raosshub.entity.ProjectConfig;
import com.raosshub.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConfigService {

    private final ProjectConfigRepository     configRepository;
    private final AppProperties               appProperties;

    // Repositories used by Danger Zone resets
    private final LocaleContentRepository     localeContentRepository;
    private final UiMessageRepository         uiMessageRepository;
    private final TeamRepository              teamRepository;
    private final UserRepository              userRepository;
    private final ChatSummaryRepository       chatSummaryRepository;
    private final GalleryImageRepository      galleryImageRepository;
    private final TeamFileRepository          teamFileRepository;
    private final PdfDocumentRepository       pdfDocumentRepository;
    private final PdfVersionRepository        pdfVersionRepository;
    private final TranslationJobRepository    translationJobRepository;
    private final NdaAgreementRepository      ndaAgreementRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    // ─── Config CRUD ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getConfig() {
        List<ProjectConfig> configs = configRepository.findAll();
        if (configs.isEmpty()) return new HashMap<>();
        Map<String, Object> config = configs.get(0).getConfig();
        return config != null ? config : new HashMap<>();
    }

    @Transactional
    public void saveConfig(Map<String, Object> config, String updatedBy) {
        try {
            Map<String, Object> existing = getConfig();
            existing.putAll(config);

            List<ProjectConfig> configs = configRepository.findAll();
            ProjectConfig projectConfig = configs.isEmpty() ? new ProjectConfig() : configs.get(0);
            projectConfig.setConfig(existing);
            projectConfig.setUpdatedBy(updatedBy);
            configRepository.save(projectConfig);
            log.info("Config saved by {}", updatedBy);
        } catch (Exception e) {
            log.error("Failed to save config: {}", e.getMessage(), e);
            throw new RuntimeException("Config save failed: " + e.getMessage(), e);
        }
    }

    // ─── Kimi API key — DB first, AppProperties fallback ─────────────────────
    /**
     * Returns the Kimi API key for use at request time.
     *
     * Priority:
     *   1. DB — project_configs.config.integrations.kimiApiKey (set via Admin Setup Tab 7)
     *   2. AppProperties — app.kimi.api-key (application.yml / env var APP_KIMI_API_KEY)
     *
     * DB takes precedence so the admin can change the key without a backend restart.
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public String getKimiApiKey() {
        try {
            Map<String, Object> config = getConfig();
            Object integrationsObj     = config.get("integrations");
            if (integrationsObj instanceof Map<?, ?> integrations) {
                Object dbKey = integrations.get("kimiApiKey");
                if (dbKey instanceof String && !((String) dbKey).isBlank()) {
                    return (String) dbKey;
                }
            }
        } catch (Exception e) {
            log.warn("Could not read Kimi key from DB config: {}", e.getMessage());
        }
        // Fallback to application.yml / environment variable
        return appProperties.getKimi().getApiKey();
    }

    // ─── Danger Zone ──────────────────────────────────────────────────────────

    /**
     * Option 1 — Reset Data.
     *
     * Clears locale_content only.
     * Preserves: users, teams, project_config, language definitions, ui_messages.
     * Use this to wipe translated content and start fresh translations via Tab 2.
     */
    @Transactional
    public void resetData() {
        localeContentRepository.deleteAll();
        log.warn("[DangerZone] Reset Data complete — locale_content cleared");
    }

    /**
     * Option 2 — Factory Reset.
     *
     * Clears all content and configuration. Preserves only superadmin user accounts.
     * Languages (EN + ZH definitions) are preserved so the app UI still loads.
     * Backend returns to fresh-install state — all team data, config and files are gone.
     */
    @Transactional
    public void factoryReset() {
        // Content
        localeContentRepository.deleteAll();
        translationJobRepository.deleteAll();

        // UI strings: keep EN (system fallback), clear all other languages
        uiMessageRepository.deleteAll(
            uiMessageRepository.findAll().stream()
                .filter(m -> !"en".equals(m.getLanguageCode()))
                .collect(Collectors.toList())
        );

        // Files — clear all uploaded content
        pdfVersionRepository.deleteAll();
        pdfDocumentRepository.deleteAll();
        teamFileRepository.deleteAll();
        galleryImageRepository.deleteAll();
        chatSummaryRepository.deleteAll();

        // Teams — cleared; admin must reconfigure via Tab 5
        teamRepository.deleteAll();

        // Users — keep only superadmin accounts; clear NDAs and reset tokens for all
        ndaAgreementRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();
        userRepository.deleteAll(
            userRepository.findAll().stream()
                .filter(u -> !"superadmin".equals(u.getRole()))
                .collect(Collectors.toList())
        );

        // Project config — reset to empty; admin must reconfigure via Admin Setup
        List<ProjectConfig> configs = configRepository.findAll();
        if (!configs.isEmpty()) {
            ProjectConfig pc = configs.get(0);
            pc.setConfig(new HashMap<>());
            pc.setUpdatedBy("factory-reset");
            configRepository.save(pc);
        }

        log.warn("[DangerZone] FACTORY RESET complete — superadmin user accounts preserved, everything else cleared");
    }
}
