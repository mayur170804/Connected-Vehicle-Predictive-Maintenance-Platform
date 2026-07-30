package com.cvpm.telemetry.risk;

import com.cvpm.telemetry.telemetry.Telemetry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RiskClient {

    private final RestClient restClient;

    public RiskClient(
            RestClient.Builder builder,
            @Value("${app.risk-service.url}") String baseUrl
    ) {
        this.restClient = builder
                .baseUrl(baseUrl)
                .build();
    }

    public RiskDtos.RiskScoreResponse score(Telemetry telemetry) {

        RiskDtos.RiskScoreRequest request =
                new RiskDtos.RiskScoreRequest(
                        telemetry.getEngineTemperature(),
                        telemetry.getBatteryLevel(),
                        telemetry.getVibration(),
                        telemetry.getMileage(),
                        telemetry.getFaultCode()
                );

        return restClient.post()
                .uri("/score")
                .body(request)
                .retrieve()
                .body(RiskDtos.RiskScoreResponse.class);
    }
}