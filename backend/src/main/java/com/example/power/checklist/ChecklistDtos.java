package com.example.power.checklist;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public final class ChecklistDtos {
    private ChecklistDtos() {
    }

    public record CategoryRequest(
            @NotBlank String name,
            String color,
            Integer sortOrder
    ) {
    }

    public record CategoryResponse(
            Long id,
            String name,
            String color,
            int sortOrder
    ) {
        static CategoryResponse from(ChecklistCategory category) {
            return new CategoryResponse(category.getId(), category.getName(), category.getColor(), category.getSortOrder());
        }
    }

    public record ItemRequest(
            @NotNull Long categoryId,
            String itemCategory,
            String todo,
            String owner,
            String memo,
            Boolean completed,
            LocalDate completedDate,
            Integer sortOrder
    ) {
    }

    public record ItemResponse(
            Long id,
            Long categoryId,
            String itemCategory,
            String todo,
            String owner,
            String memo,
            boolean completed,
            LocalDate completedDate,
            int sortOrder
    ) {
        static ItemResponse from(ChecklistItem item) {
            return new ItemResponse(
                    item.getId(),
                    item.getCategory().getId(),
                    item.getItemCategory(),
                    item.getTodo(),
                    item.getOwner(),
                    item.getMemo(),
                    item.isCompleted(),
                    item.getCompletedDate(),
                    item.getSortOrder()
            );
        }
    }

    public record ChecklistResponse(
            List<CategoryResponse> categories,
            List<ItemResponse> items
    ) {
    }
}
