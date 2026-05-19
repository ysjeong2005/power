package com.example.power.test.application.command;

import com.example.power.test.domain.TestApplication;
import com.example.power.test.infra.TestApplicationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TestApplicationCancelCommandService {
    private final TestApplicationRepository repository;

    public TestApplicationCancelCommandService(TestApplicationRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public void execute(StatusCommand command) {
        TestApplication application = repository.findByApplyId(command.applyId())
                .orElseThrow(() -> new IllegalArgumentException("신청을 찾을 수 없습니다."));

        application.cancel(command.cmptYmdhms());
    }
}
