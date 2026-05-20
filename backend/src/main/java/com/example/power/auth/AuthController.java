package com.example.power.auth;

import com.example.power.auth.AuthDtos.LoginRequest;
import com.example.power.auth.AuthDtos.MeResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/me")
    public MeResponse me() {
        return MeResponse.from(authService.currentUser());
    }

    @PostMapping("/login")
    public MeResponse login(@RequestBody LoginRequest request, HttpServletResponse response) {
        return MeResponse.from(authService.login(request.id(), request.pw(), response));
    }

    @PostMapping("/logout")
    public void logout(HttpServletResponse response) {
        authService.logout(response);
    }
}
