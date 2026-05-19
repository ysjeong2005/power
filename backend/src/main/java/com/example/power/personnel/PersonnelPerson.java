package com.example.power.personnel;

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
@Table(name = "personnel_people")
public class PersonnelPerson {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private PersonnelCategory category;

    @Column(length = 80)
    private String relation;

    @Column(length = 80)
    private String name;

    @Column(nullable = false)
    private long amount;

    @Column(nullable = false)
    private boolean invitation;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected PersonnelPerson() {
    }

    public PersonnelPerson(PersonnelCategory category) {
        this.category = category;
    }

    public void update(PersonnelCategory category, String relation, String name, long amount, boolean invitation) {
        this.category = category;
        this.relation = relation;
        this.name = name;
        this.amount = amount;
        this.invitation = invitation;
    }

    public Long getId() {
        return id;
    }

    public PersonnelCategory getCategory() {
        return category;
    }

    public String getRelation() {
        return relation;
    }

    public String getName() {
        return name;
    }

    public long getAmount() {
        return amount;
    }

    public boolean isInvitation() {
        return invitation;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
