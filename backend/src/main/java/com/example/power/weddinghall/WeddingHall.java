package com.example.power.weddinghall;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "wedding_halls")
public class WeddingHall {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 32)
    private String personalId;

    @Column(length = 120)
    private String venueName;

    @Column(length = 80)
    private String region;

    @Column(length = 200)
    private String address;

    @Column(length = 80)
    private String nearestStation;

    @Column(nullable = false)
    private boolean shuttle;

    @Column(nullable = false)
    private boolean standalone;

    @Column(length = 120)
    private String hallName;

    @Column(length = 20)
    private String mood;

    @Column(nullable = false)
    private long rentalFee;

    @Column(nullable = false)
    private long directingFee;

    @Column(nullable = false)
    private int minPeople;

    @Column(nullable = false)
    private int maxPeople;

    @Column(nullable = false)
    private long mealFee;

    @Column(length = 80)
    private String mealType;

    @Column(length = 20)
    private String weddingStyle;

    @Column(length = 40)
    private String ceremonyTime;

    @Column(nullable = false)
    private long flowerFee;

    @Column(length = 80)
    private String parking;

    @Column(length = 120)
    private String parkingFee;

    @Column(nullable = false)
    private long minAmount;

    @Column(nullable = false)
    private long maxAmount;

    @Column(length = 1000)
    private String note;

    @Column(nullable = false)
    private int sortOrder;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected WeddingHall() {
    }

    public WeddingHall(String personalId) {
        this.personalId = personalId;
    }

    public void update(WeddingHallDtos.Request request) {
        this.venueName = normalize(request.venueName());
        this.region = normalize(request.region());
        this.address = normalize(request.address());
        this.nearestStation = normalize(request.nearestStation());
        this.shuttle = Boolean.TRUE.equals(request.shuttle());
        this.standalone = Boolean.TRUE.equals(request.standalone());
        this.hallName = normalize(request.hallName());
        this.mood = normalize(request.mood());
        this.rentalFee = positive(request.rentalFee());
        this.directingFee = positive(request.directingFee());
        this.minPeople = positiveInt(request.minPeople());
        this.maxPeople = positiveInt(request.maxPeople());
        this.mealFee = positive(request.mealFee());
        this.mealType = normalize(request.mealType());
        this.weddingStyle = normalize(request.weddingStyle());
        this.ceremonyTime = normalize(request.ceremonyTime());
        this.flowerFee = positive(request.flowerFee());
        this.parking = normalize(request.parking());
        this.parkingFee = normalize(request.parkingFee());
        this.minAmount = positive(request.minAmount());
        this.maxAmount = positive(request.maxAmount());
        this.note = normalize(request.note());
        this.sortOrder = request.sortOrder() == null ? 0 : request.sortOrder();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private long positive(Long value) {
        return Math.max(value == null ? 0L : value, 0L);
    }

    private int positiveInt(Integer value) {
        return Math.max(value == null ? 0 : value, 0);
    }

    public Long getId() { return id; }
    public String getPersonalId() { return personalId; }
    public String getVenueName() { return venueName; }
    public String getRegion() { return region; }
    public String getAddress() { return address; }
    public String getNearestStation() { return nearestStation; }
    public boolean isShuttle() { return shuttle; }
    public boolean isStandalone() { return standalone; }
    public String getHallName() { return hallName; }
    public String getMood() { return mood; }
    public long getRentalFee() { return rentalFee; }
    public long getDirectingFee() { return directingFee; }
    public int getMinPeople() { return minPeople; }
    public int getMaxPeople() { return maxPeople; }
    public long getMealFee() { return mealFee; }
    public String getMealType() { return mealType; }
    public String getWeddingStyle() { return weddingStyle; }
    public String getCeremonyTime() { return ceremonyTime; }
    public long getFlowerFee() { return flowerFee; }
    public String getParking() { return parking; }
    public String getParkingFee() { return parkingFee; }
    public long getMinAmount() { return minAmount; }
    public long getMaxAmount() { return maxAmount; }
    public String getNote() { return note; }
    public int getSortOrder() { return sortOrder; }
}
