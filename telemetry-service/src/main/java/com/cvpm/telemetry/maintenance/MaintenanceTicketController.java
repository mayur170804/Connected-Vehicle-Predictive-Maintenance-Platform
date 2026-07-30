package com.cvpm.telemetry.maintenance;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}