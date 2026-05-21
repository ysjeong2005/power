package com.example.power.sdm;

import java.util.List;

public final class SdmDtos {
    private SdmDtos() {
    }

    public record Request(
            String companyName,
            String location,
            Long studioAmount,
            Long dressAmount,
            Long makeupAmount,
            String memo,
            Integer sortOrder
    ) {
    }

    public record Response(
            Long id,
            String companyName,
            String location,
            long studioAmount,
            long dressAmount,
            long makeupAmount,
            long totalAmount,
            String memo,
            int sortOrder
    ) {
        static Response from(SdmCompany company) {
            return new Response(
                    company.getId(), company.getCompanyName(), company.getLocation(), company.getStudioAmount(),
                    company.getDressAmount(), company.getMakeupAmount(), company.getTotalAmount(), company.getMemo(),
                    company.getSortOrder()
            );
        }
    }

    public record ListResponse(List<Response> items) {
    }
}
