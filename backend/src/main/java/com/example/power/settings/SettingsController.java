package com.example.power.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {
    private final SettingsService service;

    public SettingsController(SettingsService service) {
        this.service = service;
    }

    @GetMapping
    public SettingsDtos.SettingsResponse findMine() {
        return service.findMine();
    }

    @PutMapping("/dark-mode")
    public SettingsDtos.SettingsResponse updateDarkMode(@RequestBody SettingsDtos.DarkModeRequest request) {
        return service.updateDarkMode(request);
    }

    @PutMapping("/default-page")
    public SettingsDtos.SettingsResponse updateDefaultPage(@RequestBody SettingsDtos.DefaultPageRequest request) {
        return service.updateDefaultPage(request);
    }
}
