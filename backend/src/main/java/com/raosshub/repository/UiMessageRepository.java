package com.raosshub.repository;

import com.raosshub.entity.UiMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UiMessageRepository extends JpaRepository<UiMessage, Long> {
    List<UiMessage> findByLanguageCode(String languageCode);
    Optional<UiMessage> findByKeyAndLanguageCode(String key, String languageCode);
}
