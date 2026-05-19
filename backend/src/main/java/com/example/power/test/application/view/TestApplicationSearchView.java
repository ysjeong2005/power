package com.example.power.test.application.view;

import com.example.power.test.domain.TestApplication;
import java.util.List;

public record TestApplicationSearchView(List<TestApplicationView> applications) {
    public static TestApplicationSearchView of(List<TestApplication> applications) {
        return new TestApplicationSearchView(
                applications.stream()
                        .map(TestApplicationView::from)
                        .toList()
        );
    }
}
