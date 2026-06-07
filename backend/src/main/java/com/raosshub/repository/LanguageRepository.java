package com.raosshub.repository;

import com.raosshub.entity.Language;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LanguageRepository extends JpaRepository<Language, Integer> {
    Optional<Language> findByCode(String code);
    List<Language> findByIsActiveTrue();
    Optional<Language> findByIsDefaultTrue();
}
