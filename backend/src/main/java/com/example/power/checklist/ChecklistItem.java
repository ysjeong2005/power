package com.example.power.checklist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "checklist_items")
public class ChecklistItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private ChecklistCategory category;

    @Column(length = 80)
    private String itemCategory;

    @Column(length = 200)
    private String todo;

    @Column(length = 80)
    private String owner;

    @Column(length = 500)
    private String memo;

    @Column(nullable = false)
    private boolean completed;

    private LocalDate completedDate;

    @Column(nullable = false)
    private int sortOrder;

    @Column(length = 32)
    private String personalId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ChecklistItem() {
    }

    public ChecklistItem(ChecklistCategory category, String personalId) {
        this.category = category;
        this.personalId = personalId;
    }

    public void update(
            ChecklistCategory category,
            String itemCategory,
            String todo,
            String owner,
            String memo,
            boolean completed,
            LocalDate completedDate,
            int sortOrder
    ) {
        this.category = category;
        this.itemCategory = itemCategory;
        this.todo = todo;
        this.owner = owner;
        this.memo = memo;
        this.completed = completed;
        this.completedDate = completedDate;
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public ChecklistCategory getCategory() {
        return category;
    }

    public String getItemCategory() {
        return itemCategory;
    }

    public String getTodo() {
        return todo;
    }

    public String getOwner() {
        return owner;
    }

    public String getMemo() {
        return memo;
    }

    public boolean isCompleted() {
        return completed;
    }

    public LocalDate getCompletedDate() {
        return completedDate;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public String getPersonalId() {
        return personalId;
    }
}
