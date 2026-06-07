package com.raosshub.repository;

import com.raosshub.entity.ProjectConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectConfigRepository extends JpaRepository<ProjectConfig, Long> {
}
