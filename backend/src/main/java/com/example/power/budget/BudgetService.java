package com.example.power.budget;

import com.example.power.auth.AuthService;
import com.example.power.budget.BudgetDtos.BudgetResponse;
import com.example.power.budget.BudgetDtos.AssetRequest;
import com.example.power.budget.BudgetDtos.AssetResponse;
import com.example.power.budget.BudgetDtos.CategoryRequest;
import com.example.power.budget.BudgetDtos.CategoryResponse;
import com.example.power.budget.BudgetDtos.ItemRequest;
import com.example.power.budget.BudgetDtos.ItemResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BudgetService {
    private final BudgetCategoryRepository categoryRepository;
    private final BudgetItemRepository itemRepository;
    private final BudgetAssetRepository assetRepository;
    private final AuthService authService;

    public BudgetService(
            BudgetCategoryRepository categoryRepository,
            BudgetItemRepository itemRepository,
            BudgetAssetRepository assetRepository,
            AuthService authService
    ) {
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
        this.assetRepository = assetRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public BudgetResponse findAll() {
        return new BudgetResponse(findCategories(), findItems(), findAssets());
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findCategories() {
        return categoryRepository.findAllByPersonalIdOrderBySortOrderAscIdAsc(authService.currentPersonalId()).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> findItems() {
        return itemRepository.findAllByPersonalIdOrderByCategorySortOrderAscIdAsc(authService.currentPersonalId()).stream()
                .map(ItemResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> findAssets() {
        return assetRepository.findAllByPersonalIdOrderByIdAsc(authService.currentPersonalId()).stream()
                .map(AssetResponse::from)
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        BudgetCategory category = categoryRepository.save(new BudgetCategory(
                normalize(request.name()),
                request.sortOrder() == null ? nextCategoryOrder() : request.sortOrder(),
                positive(request.allocatedAmount()),
                authService.currentPersonalId()
        ));
        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        BudgetCategory category = findCategory(id);
        category.update(
                normalize(request.name()),
                request.sortOrder() == null ? category.getSortOrder() : request.sortOrder(),
                positive(request.allocatedAmount())
        );
        return CategoryResponse.from(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        BudgetCategory category = findCategory(id);
        if (itemRepository.existsByCategoryIdAndPersonalId(id, authService.currentPersonalId())) {
            throw new IllegalArgumentException("예산 항목이 있는 대분류는 삭제할 수 없습니다.");
        }
        categoryRepository.delete(category);
    }

    @Transactional
    public ItemResponse createItem(ItemRequest request) {
        BudgetCategory category = findCategory(request.categoryId());
        BudgetItem item = new BudgetItem(category, authService.currentPersonalId());
        updateItemFields(item, category, request);
        return ItemResponse.from(itemRepository.save(item));
    }

    @Transactional
    public ItemResponse updateItem(Long id, ItemRequest request) {
        String personalId = authService.currentPersonalId();
        BudgetItem item = itemRepository.findById(id)
                .filter((saved) -> personalId.equals(saved.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("예산 항목을 찾을 수 없습니다."));
        BudgetCategory category = findCategory(request.categoryId());
        updateItemFields(item, category, request);
        return ItemResponse.from(item);
    }

    @Transactional
    public void deleteItems(List<Long> ids) {
        String personalId = authService.currentPersonalId();
        ids.forEach((id) -> itemRepository.findById(id)
                .filter((item) -> personalId.equals(item.getPersonalId()))
                .ifPresent(itemRepository::delete));
    }

    @Transactional
    public AssetResponse createAsset(AssetRequest request) {
        BudgetAsset asset = assetRepository.save(new BudgetAsset(
                normalize(request.owner()),
                normalizeAvailability(request.availability()),
                normalize(request.assetName()),
                positive(request.amount()),
                normalize(request.note()),
                authService.currentPersonalId()
        ));
        return AssetResponse.from(asset);
    }

    @Transactional
    public AssetResponse updateAsset(Long id, AssetRequest request) {
        String personalId = authService.currentPersonalId();
        BudgetAsset asset = assetRepository.findById(id)
                .filter((saved) -> personalId.equals(saved.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("나의 예산 항목을 찾을 수 없습니다."));
        asset.update(
                normalize(request.owner()),
                normalizeAvailability(request.availability()),
                normalize(request.assetName()),
                positive(request.amount()),
                normalize(request.note())
        );
        return AssetResponse.from(asset);
    }

    @Transactional
    public void deleteAssets(List<Long> ids) {
        String personalId = authService.currentPersonalId();
        ids.forEach((id) -> assetRepository.findById(id)
                .filter((asset) -> personalId.equals(asset.getPersonalId()))
                .ifPresent(assetRepository::delete));
    }

    private void updateItemFields(BudgetItem item, BudgetCategory category, ItemRequest request) {
        item.update(
                category,
                normalize(request.detail()),
                positive(request.budgetAmount()),
                positive(request.spentAmount()),
                normalize(request.note())
        );
    }

    private BudgetCategory findCategory(Long id) {
        String personalId = authService.currentPersonalId();
        return categoryRepository.findById(id)
                .filter((category) -> personalId.equals(category.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("대분류를 찾을 수 없습니다."));
    }

    private int nextCategoryOrder() {
        return categoryRepository.findAllByPersonalIdOrderBySortOrderAscIdAsc(authService.currentPersonalId()).stream()
                .mapToInt(BudgetCategory::getSortOrder)
                .max()
                .orElse(-1) + 1;
    }

    private long positive(Long value) {
        return Math.max(value == null ? 0L : value, 0L);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeAvailability(String value) {
        String availability = normalize(value);
        return availability.isEmpty() ? "가용" : availability;
    }
}
