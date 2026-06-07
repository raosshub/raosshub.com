package com.raosshub.repository;

import com.raosshub.entity.ChatSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatSummaryRepository extends JpaRepository<ChatSummary, Long> {
    List<ChatSummary> findByTeamIdOrderByCreatedAtDesc(String teamId);
    List<ChatSummary> findByTeamIdAndAnalysedByInsightFalse(String teamId);
}
