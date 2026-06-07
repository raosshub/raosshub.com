package com.raosshub.repository;

import com.raosshub.entity.LocaleContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LocaleContentRepository extends JpaRepository<LocaleContent, Long> {
    List<LocaleContent> findByLanguageCode(String languageCode);
    Optional<LocaleContent> findByLanguageCodeAndSectionPath(String languageCode, String sectionPath);
}
