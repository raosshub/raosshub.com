package com.raosshub.repository;

import com.raosshub.entity.TeamFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeamFileRepository extends JpaRepository<TeamFile, Long> {
    List<TeamFile> findByTeamIdOrderByCreatedAtDesc(String teamId);
}
