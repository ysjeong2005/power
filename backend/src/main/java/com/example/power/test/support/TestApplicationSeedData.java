package com.example.power.test.support;

import com.example.power.test.domain.TestApplication;
import com.example.power.test.infra.TestApplicationRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile({"local", "docker"})
public class TestApplicationSeedData {
    @Bean
    ApplicationRunner seedTestApplications(TestApplicationRepository repository) {
        return args -> {
            if (repository.count() > 0) {
                return;
            }

            repository.save(new TestApplication(
                    "TEST-RETIREMENT-001",
                    "테스트 신청서",
                    "DDD/CQRS 구조 확인용 신청 데이터입니다."
            ));
        };
    }
}
