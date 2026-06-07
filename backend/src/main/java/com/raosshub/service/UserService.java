package com.raosshub.service;

import com.raosshub.dto.UserDto;
import com.raosshub.entity.User;
import com.raosshub.repository.UserRepository;
import com.raosshub.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        return toDto(user);
    }

    @Transactional
    public UserDto createUser(String username, String email, String firstName, String lastName,
                              String password, String role, List<String> teams, boolean canViewActivity) {
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setTeams(teams != null ? teams.toArray(new String[0]) : new String[0]);
        user.setCanViewActivity(canViewActivity);
        user.setIsActive(true);

        return toDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, String email, String firstName, String lastName,
                              String role, List<String> teams, Boolean canViewActivity, Boolean isActive) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (email != null) user.setEmail(email);
        if (firstName != null) user.setFirstName(firstName);
        if (lastName != null) user.setLastName(lastName);
        if (role != null) user.setRole(role);
        if (teams != null) user.setTeams(teams.toArray(new String[0]));
        if (canViewActivity != null) user.setCanViewActivity(canViewActivity);
        if (isActive != null) user.setIsActive(isActive);

        return toDto(userRepository.save(user));
    }

    @Transactional
    public void changePassword(Long userId, String currentPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        user.setIsActive(false);
        userRepository.save(user);
    }

    private UserDto toDto(User user) {
        return UserDto.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .firstName(user.getFirstName())
            .lastName(user.getLastName())
            .role(user.getRole())
            .teams(user.getTeams() != null ? List.of(user.getTeams()) : List.of())
            .canViewActivity(Boolean.TRUE.equals(user.getCanViewActivity()))
            .build();
    }
}
