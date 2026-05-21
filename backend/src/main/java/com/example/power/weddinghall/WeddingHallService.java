package com.example.power.weddinghall;

import com.example.power.auth.AuthService;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WeddingHallService {
    private final WeddingHallRepository repository;
    private final AuthService authService;

    public WeddingHallService(WeddingHallRepository repository, AuthService authService) {
        this.repository = repository;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public WeddingHallDtos.ListResponse findAll() {
        String personalId = authService.currentPersonalId();
        return new WeddingHallDtos.ListResponse(repository.findAllByPersonalIdOrderBySortOrderAscIdAsc(personalId)
                .stream().map(WeddingHallDtos.Response::from).toList());
    }

    @Transactional
    public WeddingHallDtos.Response create(WeddingHallDtos.Request request) {
        WeddingHall hall = new WeddingHall(authService.currentPersonalId());
        hall.update(request);
        return WeddingHallDtos.Response.from(repository.save(hall));
    }

    @Transactional
    public WeddingHallDtos.Response update(Long id, WeddingHallDtos.Request request) {
        String personalId = authService.currentPersonalId();
        WeddingHall hall = repository.findById(id)
                .filter((item) -> personalId.equals(item.getPersonalId()))
                .orElseThrow(() -> new IllegalArgumentException("웨딩홀 정보를 찾을 수 없습니다."));
        hall.update(request);
        return WeddingHallDtos.Response.from(hall);
    }

    @Transactional
    public void delete(List<Long> ids) {
        String personalId = authService.currentPersonalId();
        ids.forEach((id) -> repository.findById(id)
                .filter((item) -> personalId.equals(item.getPersonalId()))
                .ifPresent(repository::delete));
    }
}
