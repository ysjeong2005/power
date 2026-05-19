package com.example.power.personnel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "personnel_categories")
public class PersonnelCategory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String major;

    @Column(nullable = false, length = 80)
    private String minor;

    @Column(nullable = false)
    private int percent;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected PersonnelCategory() {
    }

    public PersonnelCategory(String major, String minor, int percent) {
        this.major = major;
        this.minor = minor;
        this.percent = percent;
    }

    public void update(String major, String minor, int percent) {
        this.major = major;
        this.minor = minor;
        this.percent = percent;
    }

    public Long getId() {
        return id;
    }

    public String getMajor() {
        return major;
    }

    public String getMinor() {
        return minor;
    }

    public int getPercent() {
        return percent;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
