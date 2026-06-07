package com.raosshub.config;

import com.raosshub.entity.User;
import com.raosshub.repository.NdaAgreementRepository;
import com.raosshub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

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
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Uncomment the next line to force NDA re-acceptance on every restart (for testing)
        // ndaAgreementRepository.deleteAll();

        ensureAdminUser();
        ensureDefaultUser();
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
}
