package com.example.power.checklist;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
    @EntityGraph(attributePaths = "category")
    List<ChecklistItem> findAllByPersonalIdOrderByCategorySortOrderAscSortOrderAscIdAsc(String personalId);

    boolean existsByCategoryIdAndPersonalId(Long categoryId, String personalId);

    @Modifying
    @Query("update ChecklistItem item set item.personalId = :personalId where item.personalId is null")
    void assignMissingPersonalId(String personalId);
}
