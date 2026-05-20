package com.example.power.checklist;

import com.example.power.auth.AuthService;
import com.example.power.checklist.ChecklistDtos.CategoryRequest;
import com.example.power.checklist.ChecklistDtos.CategoryResponse;
import com.example.power.checklist.ChecklistDtos.ChecklistResponse;
import com.example.power.checklist.ChecklistDtos.ItemRequest;
import com.example.power.checklist.ChecklistDtos.ItemResponse;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChecklistService {
    private static final String DEFAULT_COLOR = "#e8f4ef";

    private final ChecklistCategoryRepository categoryRepository;
    private final ChecklistItemRepository itemRepository;
    private final AuthService authService;

    public ChecklistService(
            ChecklistCategoryRepository categoryRepository,
            ChecklistItemRepository itemRepository,
            AuthService authService
    ) {
        this.categoryRepository = categoryRepository;
        this.itemRepository = itemRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public ChecklistResponse findAll() {
        return new ChecklistResponse(findCategories(), findItems());
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findCategories() {
        return categoryRepository.findAllByPersonalIdOrderBySortOrderAscIdAsc(authService.currentPersonalId()).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ItemResponse> findItems() {
        return itemRepository.findAllByPersonalIdOrderByCategorySortOrderAscSortOrderAscIdAsc(authService.currentPersonalId()).stream()
                .map(ItemResponse::from)
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        int sortOrder = request.sortOrder() == null ? nextCategoryOrder() : request.sortOrder();
        ChecklistCategory category = categoryRepository.save(new ChecklistCategory(
                request.name().trim(),
                normalizeColor(request.color()),
                sortOrder,
                authService.currentPersonalId()
        ));
        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        ChecklistCategory category = findCategory(id);
        int sortOrder = request.sortOrder() == null ? category.getSortOrder() : request.sortOrder();
        category.update(request.name().trim(), normalizeColor(request.color()), sortOrder);
        return CategoryResponse.from(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        ChecklistCategory category = findCategory(id);
        if (itemRepository.existsByCategoryIdAndPersonalId(id, authService.currentPersonalId())) {
            throw new IllegalArgumentException("체크리스트가 있는 분류는 삭제할 수 없습니다.");
        }
        categoryRepository.delete(category);
    }

    @Transactional
    public ItemResponse createItem(ItemRequest request) {
        ChecklistCategory category = findCategory(request.categoryId());
        ChecklistItem item = new ChecklistItem(category, authService.currentPersonalId());
        updateItemFields(item, category, request);
        return ItemResponse.from(itemRepository.save(item));
    }

    @Transactional
    public ItemResponse updateItem(Long id, ItemRequest request) {
        String personalId = authService.currentPersonalId();
        ChecklistItem item = itemRepository.findById(id)
                .filter((saved) -> personalId.equals(saved.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("체크리스트를 찾을 수 없습니다."));
        ChecklistCategory category = findCategory(request.categoryId());
        updateItemFields(item, category, request);
        return ItemResponse.from(item);
    }

    @Transactional
    public void deleteItems(List<Long> ids) {
        ids.forEach((id) -> itemRepository.findById(id)
                .filter((item) -> authService.currentPersonalId().equals(item.getPersonalId()))
                .ifPresent(itemRepository::delete));
    }

    private void updateItemFields(ChecklistItem item, ChecklistCategory category, ItemRequest request) {
        boolean completed = Boolean.TRUE.equals(request.completed());
        LocalDate completedDate = completed ? request.completedDate() : null;
        item.update(
                category,
                normalize(request.itemCategory()),
                normalize(request.todo()),
                normalize(request.owner()),
                normalize(request.memo()),
                completed,
                completedDate,
                request.sortOrder() == null ? 0 : request.sortOrder()
        );
    }

    private ChecklistCategory findCategory(Long id) {
        String personalId = authService.currentPersonalId();
        return categoryRepository.findById(id)
                .filter((category) -> personalId.equals(category.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("분류를 찾을 수 없습니다."));
    }

    private int nextCategoryOrder() {
        return categoryRepository.findAllByPersonalIdOrderBySortOrderAscIdAsc(authService.currentPersonalId()).stream()
                .mapToInt(ChecklistCategory::getSortOrder)
                .max()
                .orElse(-1) + 1;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeColor(String value) {
        String color = normalize(value);
        return color.isEmpty() ? DEFAULT_COLOR : color;
    }
}
