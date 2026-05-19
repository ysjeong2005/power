package com.example.power.personnel;

import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PersonnelPersonRepository extends JpaRepository<PersonnelPerson, Long> {
    @EntityGraph(attributePaths = "category")
    List<PersonnelPerson> findAllByOrderByCreatedAtAsc();

    boolean existsByCategoryId(Long categoryId);
}
