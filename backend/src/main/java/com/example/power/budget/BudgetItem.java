package com.example.power.budget;

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

@Entity
@Table(name = "budget_items")
public class BudgetItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private BudgetCategory category;

    @Column(length = 160)
    private String detail;

    @Column(nullable = false)
    private long budgetAmount;

    @Column(nullable = false)
    private long spentAmount;

    @Column(length = 500)
    private String note;

    @Column(length = 32)
    private String personalId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected BudgetItem() {
    }

    public BudgetItem(BudgetCategory category, String personalId) {
        this.category = category;
        this.personalId = personalId;
    }

    public void update(BudgetCategory category, String detail, long budgetAmount, long spentAmount, String note) {
        this.category = category;
        this.detail = detail;
        this.budgetAmount = budgetAmount;
        this.spentAmount = spentAmount;
        this.note = note;
    }

    public Long getId() {
        return id;
    }

    public BudgetCategory getCategory() {
        return category;
    }

    public String getDetail() {
        return detail;
    }

    public long getBudgetAmount() {
        return budgetAmount;
    }

    public long getSpentAmount() {
        return spentAmount;
    }

    public long getRemainingAmount() {
        return budgetAmount - spentAmount;
    }

    public String getNote() {
        return note;
    }

    public String getPersonalId() {
        return personalId;
    }
}
