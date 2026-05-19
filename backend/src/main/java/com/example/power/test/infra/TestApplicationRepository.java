package com.example.power.test.infra;

import com.example.power.test.domain.TestApplication;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TestApplicationRepository extends JpaRepository<TestApplication, Long> {
    Optional<TestApplication> findByApplyId(String applyId);

    List<TestApplication> findAllByOrderByCreatedAtDesc();
}
