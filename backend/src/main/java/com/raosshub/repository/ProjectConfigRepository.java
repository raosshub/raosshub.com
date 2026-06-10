package com.raosshub.repository;

import com.raosshub.entity.ProjectConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProjectConfigRepository extends JpaRepository<ProjectConfig, Long> {

    /**
     * Always returns the same row — the one with the lowest primary key.
     * Replaces findAll().get(0) which had no ORDER BY and returned rows
     * in non-deterministic order, causing different config data to be read
     * and written on different requests (root cause of 42-row duplication
     * and intermittent NDA / Tab 1 data loss).
     */
    Optional<ProjectConfig> findFirstByOrderByIdAsc();
}
