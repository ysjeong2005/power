package com.example.power.budget;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface BudgetCategoryRepository extends JpaRepository<BudgetCategory, Long> {
    List<BudgetCategory> findAllByPersonalIdOrderBySortOrderAscIdAsc(String personalId);

    @Modifying
    @Query("update BudgetCategory category set category.personalId = :personalId where category.personalId is null")
    void assignMissingPersonalId(String personalId);
}
