package com.example.power.personnel;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonnelCategoryRepository extends JpaRepository<PersonnelCategory, Long> {
    List<PersonnelCategory> findAllByOrderByMajorAscMinorAsc();
}
