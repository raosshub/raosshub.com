package com.raosshub.service;

import com.raosshub.entity.ProjectConfig;
import com.raosshub.repository.ProjectConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConfigService {

    private final ProjectConfigRepository configRepository;

    @Transactional(readOnly = true)
    public Object getConfig() {
        List<ProjectConfig> configs = configRepository.findAll();
        if (configs.isEmpty()) {
            return new java.util.HashMap<>();
        }
        return configs.get(0).getConfig();
    }

    @Transactional
    public void saveConfig(Object config, String updatedBy) {
        List<ProjectConfig> configs = configRepository.findAll();
        ProjectConfig projectConfig;
        if (configs.isEmpty()) {
            projectConfig = new ProjectConfig();
        } else {
            projectConfig = configs.get(0);
        }
        projectConfig.setConfig(config);
        projectConfig.setUpdatedBy(updatedBy);
        configRepository.save(projectConfig);
    }
}
