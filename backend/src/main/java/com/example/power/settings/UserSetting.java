package com.example.power.settings;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "user_settings",
        uniqueConstraints = @UniqueConstraint(columnNames = {"personal_id", "option_key"})
)
public class UserSetting {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "personal_id", length = 32, nullable = false)
    private String personalId;

    @Column(name = "option_key", length = 80, nullable = false)
    private String optionKey;

    @Column(name = "option_value", length = 500, nullable = false)
    private String optionValue;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected UserSetting() {
    }

    public UserSetting(String personalId, String optionKey, String optionValue) {
        this.personalId = personalId;
        this.optionKey = optionKey;
        this.optionValue = optionValue;
    }

    public void changeValue(String optionValue) {
        this.optionValue = optionValue == null ? "" : optionValue;
    }

    public String getOptionKey() { return optionKey; }
    public String getOptionValue() { return optionValue; }
}
