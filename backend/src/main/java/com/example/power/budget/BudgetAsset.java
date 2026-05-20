package com.example.power.budget;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "budget_assets")
public class BudgetAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String owner;

    @Column(nullable = false, length = 20)
    private String availability;

    @Column(nullable = false, length = 120)
    private String assetName;

    @Column(nullable = false)
    private long amount;

    @Column(length = 500)
    private String note;

    @Column(length = 32)
    private String personalId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected BudgetAsset() {
    }

    public BudgetAsset(String owner, String availability, String assetName, long amount, String note, String personalId) {
        this.owner = owner;
        this.availability = availability;
        this.assetName = assetName;
        this.amount = amount;
        this.note = note;
        this.personalId = personalId;
    }

    public void update(String owner, String availability, String assetName, long amount, String note) {
        this.owner = owner;
        this.availability = availability;
        this.assetName = assetName;
        this.amount = amount;
        this.note = note;
    }

    public Long getId() {
        return id;
    }

    public String getOwner() {
        return owner;
    }

    public String getAvailability() {
        return availability;
    }

    public String getAssetName() {
        return assetName;
    }

    public long getAmount() {
        return amount;
    }

    public String getNote() {
        return note;
    }

    public String getPersonalId() {
        return personalId;
    }
}
