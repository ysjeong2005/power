package com.example.power.test.application.command;

import jakarta.validation.constraints.NotBlank;

public record StatusCommand(
        @NotBlank String applyId,
        String cmptYmdhms
) {
}
