package com.example.power.weddinghall;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface WeddingHallRepository extends JpaRepository<WeddingHall, Long> {
    List<WeddingHall> findAllByPersonalIdOrderBySortOrderAscIdAsc(String personalId);

    @Modifying
    @Query("update WeddingHall hall set hall.personalId = :personalId where hall.personalId is null")
    void assignMissingPersonalId(String personalId);
}
