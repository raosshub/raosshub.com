package com.raosshub.repository;

import com.raosshub.entity.NdaAgreement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NdaAgreementRepository extends JpaRepository<NdaAgreement, Long> {
    Optional<NdaAgreement> findByUserId(Long userId);
    boolean existsByUserId(Long userId);
}
