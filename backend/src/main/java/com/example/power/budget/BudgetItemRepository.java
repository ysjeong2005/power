package com.example.power.budget;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface BudgetItemRepository extends JpaRepository<BudgetItem, Long> {
    @EntityGraph(attributePaths = "category")
    List<BudgetItem> findAllByPersonalIdOrderByCategorySortOrderAscIdAsc(String personalId);

    boolean existsByCategoryIdAndPersonalId(Long categoryId, String personalId);

    @Modifying
    @Query("update BudgetItem item set item.personalId = :personalId where item.personalId is null")
    void assignMissingPersonalId(String personalId);
}
