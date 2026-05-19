package com.example.power.personnel;

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

    public PersonnelService(PersonnelCategoryRepository categoryRepository, PersonnelPersonRepository personRepository) {
        this.categoryRepository = categoryRepository;
        this.personRepository = personRepository;
    }

    @Transactional(readOnly = true)
    public PersonnelResponse findAll() {
        return new PersonnelResponse(findCategories(), findPeople());
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> findCategories() {
        return categoryRepository.findAllByOrderByMajorAscMinorAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PersonResponse> findPeople() {
        return personRepository.findAllByOrderByCreatedAtAsc().stream()
                .map(PersonResponse::from)
                .toList();
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        PersonnelCategory category = categoryRepository.save(new PersonnelCategory(
                request.major().trim(),
                request.minor().trim(),
                request.percent()
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
        if (personRepository.existsByCategoryId(id)) {
            throw new IllegalArgumentException("이미 사용 중인 분류는 삭제할 수 없습니다.");
        }
        categoryRepository.delete(category);
    }

    @Transactional
    public PersonResponse createPerson(PersonRequest request) {
        PersonnelCategory category = findCategory(request.categoryId());
        PersonnelPerson person = new PersonnelPerson(category);
        updatePersonFields(person, category, request);
        return PersonResponse.from(personRepository.save(person));
    }

    @Transactional
    public PersonResponse updatePerson(Long id, PersonRequest request) {
        PersonnelPerson person = personRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("대상자를 찾을 수 없습니다."));
        PersonnelCategory category = findCategory(request.categoryId());
        updatePersonFields(person, category, request);
        return PersonResponse.from(person);
    }

    @Transactional
    public void deletePeople(List<Long> ids) {
        personRepository.deleteAllById(ids);
    }

    private void updatePersonFields(PersonnelPerson person, PersonnelCategory category, PersonRequest request) {
        person.update(
                category,
                normalize(request.relation()),
                normalize(request.name()),
                request.amount() == null ? 0L : Math.max(0L, request.amount()),
                Boolean.TRUE.equals(request.invitation())
        );
    }

    private PersonnelCategory findCategory(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("분류를 찾을 수 없습니다."));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
