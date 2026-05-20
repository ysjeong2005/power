package com.example.power.budget;

import com.example.power.budget.BudgetDtos.BudgetResponse;
import com.example.power.budget.BudgetDtos.AssetRequest;
import com.example.power.budget.BudgetDtos.AssetResponse;
import com.example.power.budget.BudgetDtos.CategoryRequest;
import com.example.power.budget.BudgetDtos.CategoryResponse;
import com.example.power.budget.BudgetDtos.ItemRequest;
import com.example.power.budget.BudgetDtos.ItemResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/budget")
public class BudgetController {
    private final BudgetService service;

    public BudgetController(BudgetService service) {
        this.service = service;
    }

    @GetMapping
    public BudgetResponse findAll() {
        return service.findAll();
    }

    @GetMapping("/categories")
    public List<CategoryResponse> findCategories() {
        return service.findCategories();
    }

    @GetMapping("/assets")
    public List<AssetResponse> findAssets() {
        return service.findAssets();
    }

    @PostMapping("/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse createCategory(@Valid @RequestBody CategoryRequest request) {
        return service.createCategory(request);
    }

    @PutMapping("/categories/{id}")
    public CategoryResponse updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        return service.updateCategory(id, request);
    }

    @DeleteMapping("/categories/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) {
        service.deleteCategory(id);
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public ItemResponse createItem(@Valid @RequestBody ItemRequest request) {
        return service.createItem(request);
    }

    @PutMapping("/items/{id}")
    public ItemResponse updateItem(@PathVariable Long id, @Valid @RequestBody ItemRequest request) {
        return service.updateItem(id, request);
    }

    @DeleteMapping("/items")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteItems(@RequestBody List<Long> ids) {
        service.deleteItems(ids);
    }

    @PostMapping("/assets")
    @ResponseStatus(HttpStatus.CREATED)
    public AssetResponse createAsset(@RequestBody AssetRequest request) {
        return service.createAsset(request);
    }

    @PutMapping("/assets/{id}")
    public AssetResponse updateAsset(@PathVariable Long id, @RequestBody AssetRequest request) {
        return service.updateAsset(id, request);
    }

    @DeleteMapping("/assets")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAssets(@RequestBody List<Long> ids) {
        service.deleteAssets(ids);
    }
}
