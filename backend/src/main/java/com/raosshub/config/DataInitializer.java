package com.raosshub.config;

import com.raosshub.entity.User;
import com.raosshub.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds required users on first startup only.
 *
 * Every operation is guarded by an existence check — this class is fully
 * idempotent. On every subsequent restart after the first, it logs that
 * the users already exist and does no DB writes.
 *
 * The original version re-encoded and saved the admin password on every
 * startup (BCrypt generates a different hash each time), causing an
 * unnecessary DB write and preventing permanent password changes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensureAdminUser();
        ensureDefaultUser();
    }

    /**
     * Creates the superadmin user only if it does not exist.
     * Never modifies an existing admin — password changes made in the app
     * are preserved across restarts.
     */
    private void ensureAdminUser() {
        if (userRepository.findByUsername("admin").isPresent()) {
            log.debug("[DataInit] Admin user already exists — skipping");
            return;
        }

        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail("admin@raoss.com");
        admin.setFirstName("System");
        admin.setLastName("Administrator");
        admin.setRole("superadmin");
        admin.setTeams(new String[]{"all"});
        admin.setCanViewActivity(true);
        admin.setIsActive(true);
        admin.setPasswordHash(passwordEncoder.encode("RaossAdmin2024!"));

        userRepository.save(admin);
        log.info("[DataInit] Admin user created — username: admin");
    }

    /**
     * Creates the default user only if it does not exist.
     */
    private void ensureDefaultUser() {
        if (userRepository.findByUsername("rizan").isPresent()) {
            log.debug("[DataInit] Default user already exists — skipping");
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
        log.info("[DataInit] Default user created — username: rizan");
    }
}
