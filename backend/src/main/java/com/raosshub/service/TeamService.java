package com.raosshub.service;

import com.raosshub.entity.Team;
import com.raosshub.repository.TeamRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamService {

    private final TeamRepository teamRepository;

    @Transactional(readOnly = true)
    public List<Team> getActiveTeams() {
        return teamRepository.findByIsActiveTrueOrderBySortOrderAsc();
    }

    @Transactional(readOnly = true)
    public Team getTeamByTeamId(String teamId) {
        return teamRepository.findByTeamId(teamId)
            .orElseThrow(() -> new RuntimeException("Team not found: " + teamId));
    }

    @Transactional
    public Team createTeam(String teamId, String nameEn, String nameZh, String icon, int sortOrder) {
        if (teamRepository.findByTeamId(teamId).isPresent()) {
            throw new RuntimeException("Team ID already exists: " + teamId);
        }

        Team team = new Team();
        team.setTeamId(teamId);
        team.setNameEn(nameEn);
        team.setNameZh(nameZh);
        team.setIcon(icon);
        team.setSortOrder(sortOrder);
        team.setIsActive(true);

        return teamRepository.save(team);
    }

    @Transactional
    public Team updateTeam(Long id, String nameEn, String nameZh, String icon, Integer sortOrder, Boolean isActive) {
        Team team = teamRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Team not found"));

        if (nameEn != null) team.setNameEn(nameEn);
        if (nameZh != null) team.setNameZh(nameZh);
        if (icon != null) team.setIcon(icon);
        if (sortOrder != null) team.setSortOrder(sortOrder);
        if (isActive != null) team.setIsActive(isActive);

        return teamRepository.save(team);
    }
}
