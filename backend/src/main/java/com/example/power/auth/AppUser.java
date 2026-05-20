package com.example.power.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "users")
public class AppUser {
    @Id
    @Column(length = 80)
    private String id;

    @Column(nullable = false, length = 64)
    private String pw;

    @Column(nullable = false, length = 32)
    private String personalId;

    @Column(nullable = false, length = 80)
    private String nickname;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    protected AppUser() {
    }

    public AppUser(String id, String pw, String personalId, String nickname) {
        this.id = id;
        this.pw = pw;
        this.personalId = personalId;
        this.nickname = nickname;
    }

    public String getId() {
        return id;
    }

    public String getPw() {
        return pw;
    }

    public String getPersonalId() {
        return personalId;
    }

    public String getNickname() {
        return nickname;
    }

    public void updateNickname(String nickname) {
        this.nickname = nickname;
    }
}
