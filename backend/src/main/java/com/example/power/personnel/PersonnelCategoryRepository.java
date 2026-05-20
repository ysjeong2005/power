package com.example.power.personnel;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface PersonnelCategoryRepository extends JpaRepository<PersonnelCategory, Long> {
    List<PersonnelCategory> findAllByPersonalIdOrderByMajorAscMinorAsc(String personalId);

    @Modifying
    @Query("update PersonnelCategory category set category.personalId = :personalId where category.personalId is null")
    void assignMissingPersonalId(String personalId);
}
