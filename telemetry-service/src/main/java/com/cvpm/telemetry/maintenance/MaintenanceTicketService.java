package com.cvpm.telemetry.maintenance;

import com.cvpm.telemetry.telemetry.Telemetry;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;
import com.cvpm.telemetry.common.ResourceNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MaintenanceTicketService {

    private static final Logger log =
            LoggerFactory.getLogger(MaintenanceTicketService.class);

    private final MaintenanceTicketRepository maintenanceTicketRepository;

    @Transactional
    public MaintenanceTicket createForHighRisk(
            Telemetry telemetry,
            List<String> reasons
    ) {

        // Same telemetry event already created a ticket.
        var existingForTelemetry =
                maintenanceTicketRepository.findByTelemetryId(
                        telemetry.getId()
                );

        if (existingForTelemetry.isPresent()) {

            log.info(
                    "maintenance_ticket_duplicate_skipped telemetryId={} ticketId={}",
                    telemetry.getId(),
                    existingForTelemetry.get().getId()
            );

            return existingForTelemetry.get();
        }

        // Only one OPEN ticket per vehicle.
        var existingOpen =
                maintenanceTicketRepository.findByVehicleIdAndStatus(
                        telemetry.getVehicleId(),
                        "OPEN"
                );

        if (existingOpen.isPresent()) {

            log.info(
                    "maintenance_ticket_open_exists vehicleId={} ticketId={}",
                    telemetry.getVehicleId(),
                    existingOpen.get().getId()
            );

            return existingOpen.get();
        }

        String reason =
                reasons == null || reasons.isEmpty()
                        ? "High risk telemetry detected"
                        : String.join(", ", reasons);

        MaintenanceTicket ticket =
                MaintenanceTicket.builder()
                        .vehicleId(telemetry.getVehicleId())
                        .telemetryId(telemetry.getId())
                        .riskLevel("HIGH")
                        .reason(reason)
                        .status("OPEN")
                        .build();

        try {

            MaintenanceTicket saved =
                    maintenanceTicketRepository.saveAndFlush(ticket);

            log.info(
                    "maintenance_ticket_created ticketId={} vehicleId={} telemetryId={} reason={}",
                    saved.getId(),
                    saved.getVehicleId(),
                    saved.getTelemetryId(),
                    saved.getReason()
            );

            return saved;

        } catch (DataIntegrityViolationException ex) {

            /*
             * Protects against concurrent processing where another transaction
             * creates the ticket after our checks but before this insert.
             */

            return maintenanceTicketRepository
                    .findByTelemetryId(telemetry.getId())
                    .or(() ->
                            maintenanceTicketRepository
                                    .findByVehicleIdAndStatus(
                                            telemetry.getVehicleId(),
                                            "OPEN"
                                    )
                    )
                    .orElseThrow(() -> ex);
        }
    }

    @Transactional(readOnly = true)
    public List<MaintenanceTicket> getAllTickets() {
        return maintenanceTicketRepository
                .findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public MaintenanceTicket resolveTicket(UUID ticketId) {
        MaintenanceTicket ticket = maintenanceTicketRepository
                .findById(ticketId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Maintenance ticket not found: " + ticketId
                        )
                );

        if ("RESOLVED".equalsIgnoreCase(ticket.getStatus())) {
            return ticket;
        }

        ticket.setStatus("RESOLVED");
        ticket.setUpdatedAt(Instant.now());

        MaintenanceTicket saved =
                maintenanceTicketRepository.save(ticket);

        log.info(
                "maintenance_ticket_resolved ticketId={} vehicleId={}",
                saved.getId(),
                saved.getVehicleId()
        );

        return saved;
    }
}