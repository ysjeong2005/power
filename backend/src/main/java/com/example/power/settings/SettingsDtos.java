package com.example.power.settings;

public final class SettingsDtos {
    private SettingsDtos() {
    }

    public record SettingsResponse(boolean darkMode, String defaultPage) {
    }

    public record DarkModeRequest(boolean enabled) {
    }

    public record DefaultPageRequest(String page) {
    }
}
