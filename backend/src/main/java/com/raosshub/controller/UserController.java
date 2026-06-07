package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.dto.UserDto;
import com.raosshub.security.UserDetailsImpl;
import com.raosshub.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN','SUPERADMIN')")
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        return ResponseEntity.ok(ApiResponse.ok(userService.getAllUsers()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getUserById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<UserDto>> createUser(@RequestBody Map<String, Object> body) {
        UserDto user = userService.createUser(
            (String) body.get("username"),
            (String) body.get("email"),
            (String) body.get("firstName"),
            (String) body.get("lastName"),
            (String) body.get("password"),
            (String) body.getOrDefault("role", "viewer"),
            (List<String>) body.get("teams"),
            (Boolean) body.getOrDefault("canViewActivity", false)
        );
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        UserDto user = userService.updateUser(
            id,
            (String) body.get("email"),
            (String) body.get("firstName"),
            (String) body.get("lastName"),
            (String) body.get("role"),
            (List<String>) body.get("teams"),
            (Boolean) body.get("canViewActivity"),
            (Boolean) body.get("isActive")
        );
        return ResponseEntity.ok(ApiResponse.ok(user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok(null, "User deactivated"));
    }

    @PostMapping("/change-password")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> body) {
        userService.changePassword(
            userDetails.getId(),
            body.get("currentPassword"),
            body.get("newPassword")
        );
        return ResponseEntity.ok(ApiResponse.ok(null, "Password updated"));
    }
}
