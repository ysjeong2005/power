package com.example.power.home;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface HomeRepository extends JpaRepository<HomePlace, Long> {
    List<HomePlace> findAllByPersonalIdOrderBySortOrderAscIdAsc(String personalId);

    @Modifying
    @Query("update HomePlace place set place.personalId = :personalId where place.personalId is null")
    void assignMissingPersonalId(String personalId);
}
