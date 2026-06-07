package com.raosshub.service;

import com.raosshub.entity.ProjectConfig;
import com.raosshub.repository.ProjectConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConfigService {

    private final ProjectConfigRepository configRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getConfig() {
        List<ProjectConfig> configs = configRepository.findAll();
        if (configs.isEmpty()) {
            return new HashMap<>();
        }
        Map<String, Object> config = configs.get(0).getConfig();
        return config != null ? config : new HashMap<>();
    }

    @Transactional
    public void saveConfig(Map<String, Object> config, String updatedBy) {
        try {
            Map<String, Object> existing = getConfig();
            existing.putAll(config);

            List<ProjectConfig> configs = configRepository.findAll();
            ProjectConfig projectConfig;
            if (configs.isEmpty()) {
                projectConfig = new ProjectConfig();
            } else {
                projectConfig = configs.get(0);
            }
            projectConfig.setConfig(existing);
            projectConfig.setUpdatedBy(updatedBy);
            configRepository.save(projectConfig);

            log.info("Config saved by {}", updatedBy);
        } catch (Exception e) {
            log.error("Failed to save config: {}", e.getMessage(), e);
            throw new RuntimeException("Config save failed: " + e.getMessage(), e);
        }
    }
}
