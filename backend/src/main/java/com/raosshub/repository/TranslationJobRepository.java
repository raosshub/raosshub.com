package com.raosshub.repository;

import com.raosshub.entity.TranslationJob;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TranslationJobRepository extends JpaRepository<TranslationJob, Long> {
    List<TranslationJob> findByStatusOrderByCreatedAtDesc(String status);
}
