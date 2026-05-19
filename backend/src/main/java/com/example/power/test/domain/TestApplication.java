package com.example.power.test.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "test_applications")
public class TestApplication {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String applyId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TestApplicationStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant canceledAt;

    protected TestApplication() {
    }

    public TestApplication(String applyId, String title, String content) {
        this.applyId = applyId;
        this.title = title;
        this.content = content;
        this.status = TestApplicationStatus.SUBMITTED;
    }

    public void cancel(String completedAt) {
        if (status == TestApplicationStatus.CANCELED) {
            throw new IllegalStateException("이미 취소된 신청입니다.");
        }

        this.status = TestApplicationStatus.CANCELED;
        this.canceledAt = parseCompletedAt(completedAt);
    }

    public void submit() {
        if (status == TestApplicationStatus.SUBMITTED) {
            throw new IllegalStateException("이미 신청된 상태입니다.");
        }

        this.status = TestApplicationStatus.SUBMITTED;
        this.canceledAt = null;
    }

    private Instant parseCompletedAt(String completedAt) {
        if (completedAt == null || completedAt.isBlank()) {
            return Instant.now();
        }

        return Instant.parse(completedAt);
    }

    public Long getId() {
        return id;
    }

    public String getApplyId() {
        return applyId;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public TestApplicationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getCanceledAt() {
        return canceledAt;
    }
}
