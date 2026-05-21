package com.example.power.settings;

import com.example.power.auth.AuthService;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {
    private static final String DARK_MODE_KEY = "darkMode";
    private static final String DEFAULT_PAGE_KEY = "defaultPage";
    private static final String FALLBACK_PAGE = "checklist";

    private final UserSettingRepository repository;
    private final AuthService authService;

    public SettingsService(UserSettingRepository repository, AuthService authService) {
        this.repository = repository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public SettingsDtos.SettingsResponse findMine() {
        String personalId = authService.currentPersonalId();
        Map<String, String> options = repository.findAllByPersonalId(personalId)
                .stream()
                .collect(Collectors.toMap(UserSetting::getOptionKey, UserSetting::getOptionValue));
        return new SettingsDtos.SettingsResponse(
                Boolean.parseBoolean(options.getOrDefault(DARK_MODE_KEY, "false")),
                normalizePage(options.getOrDefault(DEFAULT_PAGE_KEY, FALLBACK_PAGE))
        );
    }

    @Transactional
    public SettingsDtos.SettingsResponse updateDarkMode(SettingsDtos.DarkModeRequest request) {
        String personalId = authService.currentPersonalId();
        UserSetting setting = repository.findByPersonalIdAndOptionKey(personalId, DARK_MODE_KEY)
                .orElseGet(() -> new UserSetting(personalId, DARK_MODE_KEY, "false"));
        setting.changeValue(Boolean.toString(request.enabled()));
        repository.save(setting);
        return findMine();
    }

    @Transactional
    public SettingsDtos.SettingsResponse updateDefaultPage(SettingsDtos.DefaultPageRequest request) {
        String personalId = authService.currentPersonalId();
        UserSetting setting = repository.findByPersonalIdAndOptionKey(personalId, DEFAULT_PAGE_KEY)
                .orElseGet(() -> new UserSetting(personalId, DEFAULT_PAGE_KEY, FALLBACK_PAGE));
        setting.changeValue(normalizePage(request.page()));
        repository.save(setting);
        return findMine();
    }

    private String normalizePage(String page) {
        return switch (page == null ? "" : page.trim()) {
            case "checklist", "personnel", "budget", "weddingHall", "sdm", "home", "settings" -> page.trim();
            default -> FALLBACK_PAGE;
        };
    }
}
