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

    private final ProjectConfigRepository      configRepository;
    private final AppProperties                appProperties;

    // Repositories used by Danger Zone resets
    private final LocaleContentRepository      localeContentRepository;
    private final UiMessageRepository          uiMessageRepository;
    private final TeamRepository               teamRepository;
    private final UserRepository               userRepository;
    private final ChatSummaryRepository        chatSummaryRepository;
    private final GalleryImageRepository       galleryImageRepository;
    private final TeamFileRepository           teamFileRepository;
    private final PdfDocumentRepository        pdfDocumentRepository;
    private final PdfVersionRepository         pdfVersionRepository;
    private final TranslationJobRepository     translationJobRepository;
    private final NdaAgreementRepository       ndaAgreementRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;

    // ─── Config CRUD ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getConfig() {
        Optional<ProjectConfig> row = configRepository.findFirstByOrderByIdAsc();
        if (row.isEmpty()) return new HashMap<>();
        Map<String, Object> config = row.get().getConfig();
        return config != null ? config : new HashMap<>();
    }

    @Transactional
    public void saveConfig(Map<String, Object> config, String updatedBy) {
        try {
            Map<String, Object> existing = getConfig();

            // Deep merge: preserves keys in existing that are absent from config.
            // Prevents any partial save (e.g. {notifications:{...}}) from wiping
            // sibling sections (identity, nda, integrations) that were not included.
            deepMerge(existing, config);

            ProjectConfig projectConfig = configRepository.findFirstByOrderByIdAsc()
                                                            .orElse(new ProjectConfig());
            projectConfig.setConfig(existing);
            projectConfig.setUpdatedBy(updatedBy);
            configRepository.save(projectConfig);
            log.info("Config saved by {}", updatedBy);
        } catch (Exception e) {
            log.error("Failed to save config: {}", e.getMessage(), e);
            throw new RuntimeException("Config save failed: " + e.getMessage(), e);
        }
    }

    /**
     * Recursively merges {@code overlay} into {@code base}.
     *
     * Rules:
     *   - Leaf values (non-Map) in overlay replace the same key in base.
     *   - If both base and overlay have a Map for the same key, recurse.
     *   - Keys in base not present in overlay are preserved unchanged.
     *
     * This means a save of {identity:{projectName:"X"}} only updates
     * identity.projectName and leaves all other identity fields intact.
     */
    @SuppressWarnings("unchecked")
    private static void deepMerge(Map<String, Object> base, Map<String, Object> overlay) {
        for (Map.Entry<String, Object> entry : overlay.entrySet()) {
            String key    = entry.getKey();
            Object newVal = entry.getValue();
            Object oldVal = base.get(key);
            if (newVal instanceof Map && oldVal instanceof Map) {
                deepMerge((Map<String, Object>) oldVal, (Map<String, Object>) newVal);
            } else {
                base.put(key, newVal);
            }
        }
    }

    // ─── Kimi API key — DB first, AppProperties fallback ─────────────────────

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
        return appProperties.getKimi().getApiKey();
    }

    // ─── Danger Zone ──────────────────────────────────────────────────────────

    @Transactional
    public void resetData() {
        localeContentRepository.deleteAll();
        log.warn("[DangerZone] Reset Data complete -- locale_content cleared");
    }

    @Transactional
    public void factoryReset() {
        localeContentRepository.deleteAll();
        translationJobRepository.deleteAll();

        // UI strings: keep EN (system fallback), clear all other languages
        uiMessageRepository.deleteAll(
            uiMessageRepository.findAll().stream()
                .filter(m -> !"en".equalsIgnoreCase(m.getLanguageCode()))
                .collect(Collectors.toList())
        );

        // Project config: wipe everything
        configRepository.deleteAll();

        // Teams and related content
        teamFileRepository.deleteAll();
        teamRepository.deleteAll();

        // Files and gallery
        galleryImageRepository.deleteAll();
        pdfVersionRepository.deleteAll();
        pdfDocumentRepository.deleteAll();

        // Chat
        chatSummaryRepository.deleteAll();

        // Auth tokens
        ndaAgreementRepository.deleteAll();
        passwordResetTokenRepository.deleteAll();

        // Users: keep only superadmins
        userRepository.deleteAll(
            userRepository.findAll().stream()
                .filter(u -> !"ROLE_SUPERADMIN".equals(u.getRole()))
                .collect(Collectors.toList())
        );

        log.warn("[DangerZone] Factory Reset complete");
    }
}
