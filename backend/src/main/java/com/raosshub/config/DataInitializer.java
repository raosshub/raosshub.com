package com.raosshub.config;

import com.raosshub.entity.ProjectConfig;
import com.raosshub.entity.User;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.repository.ProjectConfigRepository;
import com.raosshub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Initializes default data on startup.
 * Ensures admin user exists with correct password — uses PasswordEncoder
 * to generate the hash, so it's always compatible with Spring Security.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final NdaAgreementRepository ndaAgreementRepository;
    private final ProjectConfigRepository projectConfigRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensureAdminUser();
        ensureDefaultUser();
        ensureDefaultConfig();
    }

    private void ensureAdminUser() {
        User admin = userRepository.findByUsername("admin").orElse(null);

        if (admin == null) {
            admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@raoss.com");
            admin.setFirstName("System");
            admin.setLastName("Administrator");
            admin.setRole("superadmin");
            admin.setTeams(new String[]{"all"});
            admin.setCanViewActivity(true);
            admin.setIsActive(true);
            log.info("Creating admin user...");
        }

        // Always update password to ensure it's correct
        String correctHash = passwordEncoder.encode("RaossAdmin2024!");
        admin.setPasswordHash(correctHash);

        userRepository.save(admin);
        log.info("Admin user ready — username: admin, password: RaossAdmin2024!");
    }

    private void ensureDefaultUser() {
        if (userRepository.findByUsername("rizan").isPresent()) {
            return;
        }

        User user = new User();
        user.setUsername("rizan");
        user.setEmail("rizan@raoss.com");
        user.setFirstName("Rizan");
        user.setLastName("User");
        user.setRole("user");
        user.setTeams(new String[]{"all"});
        user.setCanViewActivity(false);
        user.setIsActive(true);
        user.setPasswordHash(passwordEncoder.encode("RaossUser2024!"));

        userRepository.save(user);
        log.info("Default user ready — username: rizan, password: RaossUser2024!");
    }

    private void ensureDefaultConfig() {
        if (projectConfigRepository.count() > 0) {
            return; // Config already exists
        }

        Map<String, Object> defaultConfig = new HashMap<>();

        // Identity defaults
        Map<String, Object> identity = new HashMap<>();
        identity.put("projectName", "RAOSS Hub");
        identity.put("companyName", "RAOSS HK COMPANY LIMITED");
        identity.put("productCode", "");
        identity.put("status", "planning");
        identity.put("description", "");
        identity.put("logoUrl", "");
        identity.put("faviconUrl", "");
        identity.put("primaryColor", "#4f46e5");
        identity.put("productImages", new String[0]);
        identity.put("productModelUrl", "");
        identity.put("contactEmail", "");
        identity.put("websiteUrl", "");
        identity.put("referenceLinks", "");
        identity.put("copyrightNotice", "");
        identity.put("trademarkNotice", "");
        identity.put("patentNotice", "");
        identity.put("icpZh", "");
        identity.put("icpEn", "");
        defaultConfig.put("identity", identity);

        // Appearance defaults
        Map<String, Object> appearance = new HashMap<>();
        appearance.put("defaultTheme", "dark");
        appearance.put("borderRadius", "medium");
        appearance.put("enableAnimations", true);
        defaultConfig.put("appearance", appearance);

        // Notifications defaults
        Map<String, Object> notifications = new HashMap<>();
        notifications.put("emailEnabled", false);
        notifications.put("smtpHost", "localhost");
        notifications.put("smtpPort", 587);
        notifications.put("smtpUsername", "");
        notifications.put("smtpPassword", "");
        notifications.put("notifyOnUpload", true);
        notifications.put("notifyOnLogin", false);
        defaultConfig.put("notifications", notifications);

        // Integrations defaults
        Map<String, Object> integrations = new HashMap<>();
        integrations.put("kimiApiKey", "");
        integrations.put("kimiBaseUrl", "https://api.moonshot.cn/v1");
        integrations.put("proxyUrl", "");
        integrations.put("s3Endpoint", "http://localhost:9000");
        integrations.put("s3AccessKey", "raossminio");
        integrations.put("s3SecretKey", "raossminio2024");
        defaultConfig.put("integrations", integrations);

        ProjectConfig config = new ProjectConfig();
        config.setConfig(defaultConfig);
        config.setUpdatedBy("system");
        projectConfigRepository.save(config);

        log.info("Default configuration seeded");
    }
}
