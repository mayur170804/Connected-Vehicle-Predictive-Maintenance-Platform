package com.cvpm.telemetry.maintenance;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class MaintenanceTicketController {

    private final MaintenanceTicketService maintenanceTicketService;

    @GetMapping("/tickets")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public List<MaintenanceTicket> getTickets() {
        return maintenanceTicketService.getAllTickets();
    }

    @PatchMapping("/tickets/{ticketId}/resolve")
    @PreAuthorize("hasAnyRole('ADMIN', 'OPERATOR')")
    public MaintenanceTicket resolveTicket(
            @PathVariable UUID ticketId
    ) {
        return maintenanceTicketService.resolveTicket(ticketId);
    }
}