package com.example.power.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
public class AuthService {
    public static final String DEFAULT_USER_ID = "160429";
    public static final String DEFAULT_PERSONAL_ID = "D7B6C7520A7752A7962BE7FB6E5CB8F9";
    public static final String LOGIN_ID_COOKIE = "POWER_LOGIN_ID";
    public static final String PERSONAL_ID_COOKIE = "POWER_PERSONAL_ID";

    private final AppUserRepository userRepository;

    public AuthService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public AppUser login(String id, String pw, HttpServletResponse response) {
        AppUser user = userRepository.findById(normalize(id))
                .orElseThrow(() -> new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다."));
        if (!user.getPw().equals(sha256(normalize(pw)))) {
            throw new UnauthorizedException("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
        addCookie(response, LOGIN_ID_COOKIE, user.getId(), 60 * 60 * 24 * 30);
        addCookie(response, PERSONAL_ID_COOKIE, user.getPersonalId(), 60 * 60 * 24 * 30);
        return user;
    }

    public AppUser currentUser() {
        String loginId = currentCookie(LOGIN_ID_COOKIE);
        String personalId = currentCookie(PERSONAL_ID_COOKIE);
        if (loginId == null || personalId == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        AppUser user = userRepository.findById(loginId)
                .orElseThrow(() -> new UnauthorizedException("로그인이 필요합니다."));
        if (!user.getPersonalId().equals(personalId)) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        return user;
    }

    public String currentPersonalId() {
        return currentUser().getPersonalId();
    }

    public void logout(HttpServletResponse response) {
        addCookie(response, LOGIN_ID_COOKIE, "", 0);
        addCookie(response, PERSONAL_ID_COOKIE, "", 0);
    }

    public String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(normalize(raw).getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder();
            for (byte b : hash) {
                builder.append(String.format("%02x", b));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256을 사용할 수 없습니다.", error);
        }
    }

    private String currentCookie(String name) {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) return null;
        HttpServletRequest request = attributes.getRequest();
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        return Arrays.stream(cookies)
                .filter((cookie) -> name.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "Lax");
        response.addCookie(cookie);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
