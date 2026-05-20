package com.example.power.auth;

public final class AuthDtos {
    private AuthDtos() {
    }

    public record LoginRequest(String id, String pw) {
    }

    public record MeResponse(String id, String personalId, String nickname) {
        static MeResponse from(AppUser user) {
            return new MeResponse(user.getId(), user.getPersonalId(), user.getNickname());
        }
    }
}
