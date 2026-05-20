package com.example.power.checklist;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "checklist_categories")
public class ChecklistCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 20)
    private String color;

    @Column(nullable = false)
    private int sortOrder;

    @Column(length = 32)
    private String personalId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected ChecklistCategory() {
    }

    public ChecklistCategory(String name, String color, int sortOrder, String personalId) {
        this.name = name;
        this.color = color;
        this.sortOrder = sortOrder;
        this.personalId = personalId;
    }

    public void update(String name, String color, int sortOrder) {
        this.name = name;
        this.color = color;
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getColor() {
        return color;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public String getPersonalId() {
        return personalId;
    }
}
