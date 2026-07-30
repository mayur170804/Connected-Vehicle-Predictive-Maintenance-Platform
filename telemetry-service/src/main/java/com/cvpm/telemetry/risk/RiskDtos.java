package com.cvpm.telemetry.risk;

import java.util.List;

public class RiskDtos {

    public record RiskScoreRequest(
            Double engineTemperature,
            Double batteryLevel,
            Double vibration,
            Double mileage,
            String faultCode
    ) {}

    public record RiskScoreResponse(
            String riskLevel,
            List<String> reasons
    ) {}

    private RiskDtos() {}
}