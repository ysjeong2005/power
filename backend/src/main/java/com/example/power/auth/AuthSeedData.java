package com.example.power.auth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class AuthSeedData implements CommandLineRunner {
    private final AppUserRepository userRepository;
    private final AuthService authService;

    public AuthSeedData(AppUserRepository userRepository, AuthService authService) {
        this.userRepository = userRepository;
        this.authService = authService;
    }

    @Override
    public void run(String... args) {
        AppUser user = userRepository.findById(AuthService.DEFAULT_USER_ID)
                .orElseGet(() -> userRepository.save(new AppUser(
                        AuthService.DEFAULT_USER_ID,
                        authService.sha256(AuthService.DEFAULT_USER_ID),
                        AuthService.DEFAULT_PERSONAL_ID,
                        "zeroy"
                )));
        if (user.getNickname() == null || user.getNickname().isBlank()) {
            user.updateNickname("zeroy");
            userRepository.save(user);
        }
    }
}
