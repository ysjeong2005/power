package com.example.power.auth;

import com.example.power.budget.BudgetAssetRepository;
import com.example.power.budget.BudgetCategoryRepository;
import com.example.power.budget.BudgetItemRepository;
import com.example.power.checklist.ChecklistCategoryRepository;
import com.example.power.checklist.ChecklistItemRepository;
import com.example.power.personnel.PersonnelCategoryRepository;
import com.example.power.personnel.PersonnelPersonRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PersonalDataMigration implements CommandLineRunner {
    private final ChecklistCategoryRepository checklistCategoryRepository;
    private final ChecklistItemRepository checklistItemRepository;
    private final PersonnelCategoryRepository personnelCategoryRepository;
    private final PersonnelPersonRepository personnelPersonRepository;
    private final BudgetCategoryRepository budgetCategoryRepository;
    private final BudgetItemRepository budgetItemRepository;
    private final BudgetAssetRepository budgetAssetRepository;

    public PersonalDataMigration(
            ChecklistCategoryRepository checklistCategoryRepository,
            ChecklistItemRepository checklistItemRepository,
            PersonnelCategoryRepository personnelCategoryRepository,
            PersonnelPersonRepository personnelPersonRepository,
            BudgetCategoryRepository budgetCategoryRepository,
            BudgetItemRepository budgetItemRepository,
            BudgetAssetRepository budgetAssetRepository
    ) {
        this.checklistCategoryRepository = checklistCategoryRepository;
        this.checklistItemRepository = checklistItemRepository;
        this.personnelCategoryRepository = personnelCategoryRepository;
        this.personnelPersonRepository = personnelPersonRepository;
        this.budgetCategoryRepository = budgetCategoryRepository;
        this.budgetItemRepository = budgetItemRepository;
        this.budgetAssetRepository = budgetAssetRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        String defaultPersonalId = AuthService.DEFAULT_PERSONAL_ID;
        checklistCategoryRepository.assignMissingPersonalId(defaultPersonalId);
        checklistItemRepository.assignMissingPersonalId(defaultPersonalId);
        personnelCategoryRepository.assignMissingPersonalId(defaultPersonalId);
        personnelPersonRepository.assignMissingPersonalId(defaultPersonalId);
        budgetCategoryRepository.assignMissingPersonalId(defaultPersonalId);
        budgetItemRepository.assignMissingPersonalId(defaultPersonalId);
        budgetAssetRepository.assignMissingPersonalId(defaultPersonalId);
    }
}
