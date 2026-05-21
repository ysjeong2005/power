package com.example.power.home;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "home_places")
public class HomePlace {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 32)
    private String personalId;

    @Column(length = 120)
    private String apartmentName;

    @Column(length = 200)
    private String location;

    @Column(length = 80)
    private String supplyArea;

    @Column(length = 80)
    private String pyeong;

    @Column(nullable = false)
    private long hogangnonoAmount;

    @Column(nullable = false)
    private long naverAmount;

    @Column(length = 20)
    private String parkingStatus;

    @Column(length = 120)
    private String sunDirection;

    @Column(length = 1000)
    private String memo;

    @Column(nullable = false)
    private int sortOrder;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected HomePlace() {
    }

    public HomePlace(String personalId) {
        this.personalId = personalId;
    }

    public void update(HomeDtos.Request request) {
        this.apartmentName = normalize(request.apartmentName());
        this.location = normalize(request.location());
        this.supplyArea = normalize(request.supplyArea());
        this.pyeong = normalize(request.pyeong());
        this.hogangnonoAmount = positive(request.hogangnonoAmount());
        this.naverAmount = positive(request.naverAmount());
        this.parkingStatus = normalize(request.parkingStatus());
        this.sunDirection = normalize(request.sunDirection());
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
    public String getApartmentName() { return apartmentName; }
    public String getLocation() { return location; }
    public String getSupplyArea() { return supplyArea; }
    public String getPyeong() { return pyeong; }
    public long getHogangnonoAmount() { return hogangnonoAmount; }
    public long getNaverAmount() { return naverAmount; }
    public String getParkingStatus() { return parkingStatus; }
    public String getSunDirection() { return sunDirection; }
    public String getMemo() { return memo; }
    public int getSortOrder() { return sortOrder; }
}
