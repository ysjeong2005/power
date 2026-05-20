package com.example.power.personnel;

import com.example.power.auth.AuthService;
import com.example.power.personnel.PersonnelDtos.CategoryRequest;
import com.example.power.personnel.PersonnelDtos.CategoryResponse;
import com.example.power.personnel.PersonnelDtos.PersonRequest;
import com.example.power.personnel.PersonnelDtos.PersonResponse;
import com.example.power.personnel.PersonnelDtos.PersonnelResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PersonnelService {
    private final PersonnelCategoryRepository categoryRepository;
    private final PersonnelPersonRepository personRepository;
    private final AuthService authService;

    public PersonnelService(
            PersonnelCategoryRepository categoryRepository,
            PersonnelPersonRepository personRepository,
            AuthService authService
    ) {
        this.categoryRepository = categoryRepository;
        this.personRepository = personRepository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public PersonnelResponse findAll() {
        return new PersonnelResponse(findCategories(), findPeople());
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findCategories() {
        return categoryRepository.findAllByPersonalIdOrderByMajorAscMinorAsc(authService.currentPersonalId()).stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PersonResponse> findPeople() {
        return personRepository.findAllByPersonalIdOrderByCreatedAtAsc(authService.currentPersonalId()).stream()
                .map(PersonResponse::from)
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        PersonnelCategory category = categoryRepository.save(new PersonnelCategory(
                request.major().trim(),
                request.minor().trim(),
                request.percent(),
                authService.currentPersonalId()
        ));
        return CategoryResponse.from(category);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        PersonnelCategory category = findCategory(id);
        category.update(request.major().trim(), request.minor().trim(), request.percent());
        return CategoryResponse.from(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        PersonnelCategory category = findCategory(id);
        if (personRepository.existsByCategoryIdAndPersonalId(id, authService.currentPersonalId())) {
            throw new IllegalArgumentException("이미 사용 중인 분류는 삭제할 수 없습니다.");
        }
        categoryRepository.delete(category);
    }

    @Transactional
    public PersonResponse createPerson(PersonRequest request) {
        PersonnelCategory category = findCategory(request.categoryId());
        PersonnelPerson person = new PersonnelPerson(category, authService.currentPersonalId());
        updatePersonFields(person, category, request);
        return PersonResponse.from(personRepository.save(person));
    }

    @Transactional
    public PersonResponse updatePerson(Long id, PersonRequest request) {
        String personalId = authService.currentPersonalId();
        PersonnelPerson person = personRepository.findById(id)
                .filter((saved) -> personalId.equals(saved.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("대상자를 찾을 수 없습니다."));
        PersonnelCategory category = findCategory(request.categoryId());
        updatePersonFields(person, category, request);
        return PersonResponse.from(person);
    }

    @Transactional
    public void deletePeople(List<Long> ids) {
        String personalId = authService.currentPersonalId();
        ids.forEach((id) -> personRepository.findById(id)
                .filter((person) -> personalId.equals(person.getPersonalId()))
                .ifPresent(personRepository::delete));
    }

    private void updatePersonFields(PersonnelPerson person, PersonnelCategory category, PersonRequest request) {
        person.update(
                category,
                normalize(request.relation()),
                normalize(request.name()),
                request.amount() == null ? 0L : Math.max(0L, request.amount()),
                Boolean.TRUE.equals(request.invitation()),
                normalize(request.memo())
        );
    }

    private PersonnelCategory findCategory(Long id) {
        String personalId = authService.currentPersonalId();
        return categoryRepository.findById(id)
                .filter((category) -> personalId.equals(category.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("분류를 찾을 수 없습니다."));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
