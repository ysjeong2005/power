package com.example.power.test.application.view;

import com.example.power.test.domain.TestApplication;
import com.example.power.test.domain.TestApplicationStatus;
import java.time.Instant;

public record TestApplicationView(
        String applyId,
        String title,
        String content,
        TestApplicationStatus status,
        Instant createdAt,
        Instant canceledAt
) {
    public static TestApplicationView from(TestApplication application) {
        return new TestApplicationView(
                application.getApplyId(),
                application.getTitle(),
                application.getContent(),
                application.getStatus(),
                application.getCreatedAt(),
                application.getCanceledAt()
        );
    }
}
