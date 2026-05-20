package com.example.power.budget;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface BudgetAssetRepository extends JpaRepository<BudgetAsset, Long> {
    List<BudgetAsset> findAllByPersonalIdOrderByIdAsc(String personalId);

    @Modifying
    @Query("update BudgetAsset asset set asset.personalId = :personalId where asset.personalId is null")
    void assignMissingPersonalId(String personalId);
}
