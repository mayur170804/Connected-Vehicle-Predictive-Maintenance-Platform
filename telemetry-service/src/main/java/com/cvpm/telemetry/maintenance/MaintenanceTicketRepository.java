package com.cvpm.telemetry.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaintenanceTicketRepository
        extends JpaRepository<MaintenanceTicket, UUID> {

    Optional<MaintenanceTicket> findByTelemetryId(UUID telemetryId);

    Optional<MaintenanceTicket> findByVehicleIdAndStatus(
            UUID vehicleId,
            String status
    );

    List<MaintenanceTicket> findAllByOrderByCreatedAtDesc();
}