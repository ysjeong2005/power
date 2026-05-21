package com.example.power.settings;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSettingRepository extends JpaRepository<UserSetting, Long> {
    List<UserSetting> findAllByPersonalId(String personalId);
    Optional<UserSetting> findByPersonalIdAndOptionKey(String personalId, String optionKey);
}
