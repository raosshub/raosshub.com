package com.raosshub.controller;

import com.raosshub.dto.ApiResponse;
import com.raosshub.entity.Team;
import com.raosshub.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamService teamService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<Team>>> getTeams() {
        return ResponseEntity.ok(ApiResponse.ok(teamService.getActiveTeams()));
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Team>> createTeam(@RequestBody Map<String, Object> body) {
        Team team = teamService.createTeam(
            (String) body.get("teamId"),
            (String) body.get("nameEn"),
            (String) body.get("nameZh"),
            (String) body.get("icon"),
            ((Number) body.getOrDefault("sortOrder", 0)).intValue()
        );
        return ResponseEntity.ok(ApiResponse.ok(team));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public ResponseEntity<ApiResponse<Team>> updateTeam(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Team team = teamService.updateTeam(
            id,
            (String) body.get("nameEn"),
            (String) body.get("nameZh"),
            (String) body.get("icon"),
            body.get("sortOrder") != null ? ((Number) body.get("sortOrder")).intValue() : null,
            (Boolean) body.get("isActive")
        );
        return ResponseEntity.ok(ApiResponse.ok(team));
    }
}
