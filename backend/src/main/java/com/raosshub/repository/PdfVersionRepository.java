package com.raosshub.repository;

import com.raosshub.entity.PdfVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PdfVersionRepository extends JpaRepository<PdfVersion, Long> {
    List<PdfVersion> findByDocumentIdOrderByCreatedAtDesc(Long documentId);
}
