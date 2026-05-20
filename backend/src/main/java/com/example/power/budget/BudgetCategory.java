package com.example.power.budget;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "budget_categories")
public class BudgetCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false)
    private int sortOrder;

    @Column(nullable = false)
    private long allocatedAmount;

    @Column(length = 32)
    private String personalId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected BudgetCategory() {
    }

    public BudgetCategory(String name, int sortOrder, long allocatedAmount, String personalId) {
        this.name = name;
        this.sortOrder = sortOrder;
        this.allocatedAmount = allocatedAmount;
        this.personalId = personalId;
    }

    public void update(String name, int sortOrder, long allocatedAmount) {
        this.name = name;
        this.sortOrder = sortOrder;
        this.allocatedAmount = allocatedAmount;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public long getAllocatedAmount() {
        return allocatedAmount;
    }

    public String getPersonalId() {
        return personalId;
    }
}
