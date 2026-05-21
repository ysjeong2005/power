package com.example.power.sdm;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "sdm_companies")
public class SdmCompany {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 32)
    private String personalId;

    @Column(length = 120)
    private String companyName;

    @Column(length = 120)
    private String location;

    @Column(nullable = false)
    private long studioAmount;

    @Column(nullable = false)
    private long dressAmount;

    @Column(nullable = false)
    private long makeupAmount;

    @Column(length = 1000)
    private String memo;

    @Column(nullable = false)
    private int sortOrder;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected SdmCompany() {
    }

    public SdmCompany(String personalId) {
        this.personalId = personalId;
    }

    public void update(SdmDtos.Request request) {
        this.companyName = normalize(request.companyName());
        this.location = normalize(request.location());
        this.studioAmount = positive(request.studioAmount());
        this.dressAmount = positive(request.dressAmount());
        this.makeupAmount = positive(request.makeupAmount());
        this.memo = normalize(request.memo());
        this.sortOrder = request.sortOrder() == null ? 0 : request.sortOrder();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private long positive(Long value) {
        return Math.max(value == null ? 0L : value, 0L);
    }

    public Long getId() { return id; }
    public String getPersonalId() { return personalId; }
    public String getCompanyName() { return companyName; }
    public String getLocation() { return location; }
    public long getStudioAmount() { return studioAmount; }
    public long getDressAmount() { return dressAmount; }
    public long getMakeupAmount() { return makeupAmount; }
    public long getTotalAmount() { return studioAmount + dressAmount + makeupAmount; }
    public String getMemo() { return memo; }
    public int getSortOrder() { return sortOrder; }
}
