package com.example.power.checklist;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ChecklistCategoryRepository extends JpaRepository<ChecklistCategory, Long> {
    List<ChecklistCategory> findAllByPersonalIdOrderBySortOrderAscIdAsc(String personalId);

    @Modifying
    @Query("update ChecklistCategory category set category.personalId = :personalId where category.personalId is null")
    void assignMissingPersonalId(String personalId);
}
