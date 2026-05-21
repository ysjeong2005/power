package com.example.power.weddinghall;

import java.util.List;

public final class WeddingHallDtos {
    private WeddingHallDtos() {
    }

    public record Request(
            String venueName,
            String region,
            String address,
            String nearestStation,
            Boolean shuttle,
            Boolean standalone,
            String hallName,
            String mood,
            Long rentalFee,
            Long directingFee,
            Integer minPeople,
            Integer maxPeople,
            Long mealFee,
            String mealType,
            String weddingStyle,
            String ceremonyTime,
            Long flowerFee,
            String parking,
            String parkingFee,
            Long minAmount,
            Long maxAmount,
            String note,
            Integer sortOrder
    ) {
    }

    public record Response(
            Long id,
            String venueName,
            String region,
            String address,
            String nearestStation,
            boolean shuttle,
            boolean standalone,
            String hallName,
            String mood,
            long rentalFee,
            long directingFee,
            int minPeople,
            int maxPeople,
            long mealFee,
            String mealType,
            String weddingStyle,
            String ceremonyTime,
            long flowerFee,
            String parking,
            String parkingFee,
            long minAmount,
            long maxAmount,
            String note,
            int sortOrder
    ) {
        static Response from(WeddingHall hall) {
            return new Response(
                    hall.getId(), hall.getVenueName(), hall.getRegion(), hall.getAddress(), hall.getNearestStation(),
                    hall.isShuttle(), hall.isStandalone(), hall.getHallName(), hall.getMood(), hall.getRentalFee(),
                    hall.getDirectingFee(), hall.getMinPeople(), hall.getMaxPeople(), hall.getMealFee(),
                    hall.getMealType(), hall.getWeddingStyle(), hall.getCeremonyTime(), hall.getFlowerFee(),
                    hall.getParking(), hall.getParkingFee(), hall.getMinAmount(), hall.getMaxAmount(), hall.getNote(),
                    hall.getSortOrder()
            );
        }
    }

    public record ListResponse(List<Response> items) {
    }
}
