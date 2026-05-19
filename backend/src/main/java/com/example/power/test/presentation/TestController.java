package com.example.power.test.presentation;

import com.example.power.test.application.command.StatusCommand;
import com.example.power.test.application.command.TestApplicationCancelCommandService;
import com.example.power.test.application.command.TestApplicationSubmitCommandService;
import com.example.power.test.application.query.TestApplicationQueryService;
import com.example.power.test.application.query.TestApplicationSearchQuery;
import com.example.power.test.application.view.TestApplicationSearchView;
import com.example.power.test.support.ApplyAction;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Validated
public class TestController {
    private final TestApplicationQueryService queryService;
    private final TestApplicationSubmitCommandService submitCommandService;
    private final TestApplicationCancelCommandService cancelCommandService;

    public TestController(
            TestApplicationQueryService queryService,
            TestApplicationSubmitCommandService submitCommandService,
            TestApplicationCancelCommandService cancelCommandService
    ) {
        this.queryService = queryService;
        this.submitCommandService = submitCommandService;
        this.cancelCommandService = cancelCommandService;
    }

    @PostMapping("/api/test" + ApplyAction.SEARCH)
    public ResponseEntity<TestApplicationSearchView> searchApply(
            @RequestBody(required = false) TestApplicationSearchQuery query
    ) {
        TestApplicationSearchQuery safeQuery = query == null ? new TestApplicationSearchQuery(null) : query;
        return ResponseEntity.ok(TestApplicationSearchView.of(queryService.execute(safeQuery)));
    }

    @PostMapping("/api/test" + ApplyAction.APPLY)
    public ResponseEntity<Map<String, Object>> submitApply(@Valid @RequestBody StatusCommand command) {
        submitCommandService.execute(command);
        return ResponseEntity.ok(new HashMap<>());
    }

    @PostMapping("/api/test" + ApplyAction.CANCEL)
    public ResponseEntity<Map<String, Object>> cancelApply(@Valid @RequestBody StatusCommand command) {
        cancelCommandService.execute(command);
        return ResponseEntity.ok(new HashMap<>());
    }
}
