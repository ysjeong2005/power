package com.example.power.test.application.query;

import com.example.power.test.domain.TestApplication;
import com.example.power.test.infra.TestApplicationRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TestApplicationQueryService {
    private final TestApplicationRepository repository;

    public TestApplicationQueryService(TestApplicationRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<TestApplication> execute(TestApplicationSearchQuery query) {
        if (query.applyId() == null || query.applyId().isBlank()) {
            return repository.findAllByOrderByCreatedAtDesc();
        }

        return repository.findByApplyId(query.applyId())
                .map(List::of)
                .orElseGet(List::of);
    }
}
