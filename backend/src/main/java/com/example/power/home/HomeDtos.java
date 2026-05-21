package com.example.power.home;

import java.util.List;

public final class HomeDtos {
    private HomeDtos() {
    }

    public record Request(
            String apartmentName,
            String location,
            String supplyArea,
            String pyeong,
            Long hogangnonoAmount,
            Long naverAmount,
            String parkingStatus,
            String sunDirection,
            String memo,
            Integer sortOrder
    ) {
    }

    public record Response(
            Long id,
            String apartmentName,
            String location,
            String supplyArea,
            String pyeong,
            long hogangnonoAmount,
            long naverAmount,
            String parkingStatus,
            String sunDirection,
            String memo,
            int sortOrder
    ) {
        static Response from(HomePlace place) {
            return new Response(
                    place.getId(), place.getApartmentName(), place.getLocation(), place.getSupplyArea(),
                    place.getPyeong(), place.getHogangnonoAmount(), place.getNaverAmount(),
                    place.getParkingStatus(), place.getSunDirection(), place.getMemo(), place.getSortOrder()
            );
        }
    }

    public record ListResponse(List<Response> items) {
    }
}
