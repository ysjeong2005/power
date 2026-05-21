package com.example.power.home;

import com.example.power.auth.AuthService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HomeService {
    private final HomeRepository repository;
    private final AuthService authService;

    public HomeService(HomeRepository repository, AuthService authService) {
        this.repository = repository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public HomeDtos.ListResponse findAll() {
        String personalId = authService.currentPersonalId();
        return new HomeDtos.ListResponse(repository.findAllByPersonalIdOrderBySortOrderAscIdAsc(personalId)
                .stream().map(HomeDtos.Response::from).toList());
    }

    @Transactional
    public HomeDtos.Response create(HomeDtos.Request request) {
        HomePlace place = new HomePlace(authService.currentPersonalId());
        place.update(request);
        return HomeDtos.Response.from(repository.save(place));
    }

    @Transactional
    public HomeDtos.Response update(Long id, HomeDtos.Request request) {
        String personalId = authService.currentPersonalId();
        HomePlace place = repository.findById(id)
                .filter((item) -> personalId.equals(item.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("보금자리 정보를 찾을 수 없습니다."));
        place.update(request);
        return HomeDtos.Response.from(place);
    }

    @Transactional
    public void delete(List<Long> ids) {
        String personalId = authService.currentPersonalId();
        ids.forEach((id) -> repository.findById(id)
                .filter((item) -> personalId.equals(item.getPersonalId()))
                .ifPresent(repository::delete));
    }
}
