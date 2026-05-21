package com.example.power.sdm;

import com.example.power.auth.AuthService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SdmService {
    private final SdmRepository repository;
    private final AuthService authService;

    public SdmService(SdmRepository repository, AuthService authService) {
        this.repository = repository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public SdmDtos.ListResponse findAll() {
        String personalId = authService.currentPersonalId();
        return new SdmDtos.ListResponse(repository.findAllByPersonalIdOrderBySortOrderAscIdAsc(personalId)
                .stream().map(SdmDtos.Response::from).toList());
    }

    @Transactional
    public SdmDtos.Response create(SdmDtos.Request request) {
        SdmCompany company = new SdmCompany(authService.currentPersonalId());
        company.update(request);
        return SdmDtos.Response.from(repository.save(company));
    }

    @Transactional
    public SdmDtos.Response update(Long id, SdmDtos.Request request) {
        String personalId = authService.currentPersonalId();
        SdmCompany company = repository.findById(id)
                .filter((item) -> personalId.equals(item.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("스드메 정보를 찾을 수 없습니다."));
        company.update(request);
        return SdmDtos.Response.from(company);
    }

    @Transactional
    public void delete(List<Long> ids) {
        String personalId = authService.currentPersonalId();
        ids.forEach((id) -> repository.findById(id)
                .filter((item) -> personalId.equals(item.getPersonalId()))
                .ifPresent(repository::delete));
    }
}
