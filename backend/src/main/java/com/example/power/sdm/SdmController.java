package com.example.power.sdm;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sdm")
public class SdmController {
    private final SdmService service;

    public SdmController(SdmService service) {
        this.service = service;
    }

    @GetMapping
    public SdmDtos.ListResponse findAll() {
        return service.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SdmDtos.Response create(@RequestBody SdmDtos.Request request) {
        return service.create(request);
    }

    @PutMapping("/{id}")
    public SdmDtos.Response update(@PathVariable Long id, @RequestBody SdmDtos.Request request) {
        return service.update(id, request);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestBody List<Long> ids) {
        service.delete(ids);
    }
}
