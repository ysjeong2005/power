package com.example.power.personnel;

import com.example.power.personnel.PersonnelDtos.CategoryRequest;
import com.example.power.personnel.PersonnelDtos.CategoryResponse;
import com.example.power.personnel.PersonnelDtos.PersonRequest;
import com.example.power.personnel.PersonnelDtos.PersonResponse;
import com.example.power.personnel.PersonnelDtos.PersonnelResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/personnel")
public class PersonnelController {
    private final PersonnelService service;

    public PersonnelController(PersonnelService service) {
        this.service = service;
    }

    @GetMapping
    public PersonnelResponse findAll() {
        return service.findAll();
    }

    @GetMapping("/categories")
    public List<CategoryResponse> findCategories() {
        return service.findCategories();
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

    @GetMapping("/people")
    public List<PersonResponse> findPeople() {
        return service.findPeople();
    }

    @PostMapping("/people")
    @ResponseStatus(HttpStatus.CREATED)
    public PersonResponse createPerson(@Valid @RequestBody PersonRequest request) {
        return service.createPerson(request);
    }

    @PutMapping("/people/{id}")
    public PersonResponse updatePerson(@PathVariable Long id, @Valid @RequestBody PersonRequest request) {
        return service.updatePerson(id, request);
    }

    @DeleteMapping("/people")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePeople(@RequestBody List<Long> ids) {
        service.deletePeople(ids);
    }
}
