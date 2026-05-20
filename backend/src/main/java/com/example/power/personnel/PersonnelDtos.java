package com.example.power.personnel;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public final class PersonnelDtos {
    private PersonnelDtos() {
    }

    public record CategoryRequest(
            @NotBlank String major,
            @NotBlank String minor,
            @Min(0) @Max(100) int percent
    ) {
    }

    public record CategoryResponse(
            Long id,
            String major,
            String minor,
            int percent
    ) {
        static CategoryResponse from(PersonnelCategory category) {
            return new CategoryResponse(category.getId(), category.getMajor(), category.getMinor(), category.getPercent());
        }
    }

    public record PersonRequest(
            @NotNull Long categoryId,
            String relation,
            String name,
            Long amount,
            Boolean invitation,
            String memo
    ) {
    }

    public record PersonResponse(
            Long id,
            Long categoryId,
            String relation,
            String name,
            long amount,
            boolean invitation,
            String memo
    ) {
        static PersonResponse from(PersonnelPerson person) {
            return new PersonResponse(
                    person.getId(),
                    person.getCategory().getId(),
                    person.getRelation(),
                    person.getName(),
                    person.getAmount(),
                    person.isInvitation(),
                    person.getMemo()
            );
        }
    }

    public record PersonnelResponse(
            List<CategoryResponse> categories,
            List<PersonResponse> people
    ) {
    }
}
