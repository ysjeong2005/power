package com.example.power.budget;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public final class BudgetDtos {
    private BudgetDtos() {
    }

    public record CategoryRequest(
            @NotBlank String name,
            Integer sortOrder,
            Long allocatedAmount
    ) {
    }

    public record CategoryResponse(
            Long id,
            String name,
            int sortOrder,
            long allocatedAmount
    ) {
        static CategoryResponse from(BudgetCategory category) {
            return new CategoryResponse(
                    category.getId(),
                    category.getName(),
                    category.getSortOrder(),
                    category.getAllocatedAmount()
            );
        }
    }

    public record AssetRequest(
            String owner,
            String availability,
            String assetName,
            Long amount,
            String note
    ) {
    }

    public record AssetResponse(
            Long id,
            String owner,
            String availability,
            String assetName,
            long amount,
            String note
    ) {
        static AssetResponse from(BudgetAsset asset) {
            return new AssetResponse(
                    asset.getId(),
                    asset.getOwner(),
                    asset.getAvailability(),
                    asset.getAssetName(),
                    asset.getAmount(),
                    asset.getNote()
            );
        }
    }

    public record ItemRequest(
            @NotNull Long categoryId,
            String detail,
            Long budgetAmount,
            Long spentAmount,
            String note
    ) {
    }

    public record ItemResponse(
            Long id,
            Long categoryId,
            String detail,
            long budgetAmount,
            long spentAmount,
            long remainingAmount,
            String note
    ) {
        static ItemResponse from(BudgetItem item) {
            return new ItemResponse(
                    item.getId(),
                    item.getCategory().getId(),
                    item.getDetail(),
                    item.getBudgetAmount(),
                    item.getSpentAmount(),
                    item.getRemainingAmount(),
                    item.getNote()
            );
        }
    }

    public record BudgetResponse(
            List<CategoryResponse> categories,
            List<ItemResponse> items,
            List<AssetResponse> assets
    ) {
    }
}
