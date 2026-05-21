package com.example.power.sdm;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface SdmRepository extends JpaRepository<SdmCompany, Long> {
    List<SdmCompany> findAllByPersonalIdOrderBySortOrderAscIdAsc(String personalId);

    @Modifying
    @Query("update SdmCompany company set company.personalId = :personalId where company.personalId is null")
    void assignMissingPersonalId(String personalId);
}
