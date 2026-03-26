# Architectural & Technical Decisions

## API Implementation
- **Decision:** Interactive Reference.
  - *Rationale:* Instead of a standalone settings page, interactive server commands (`server_info`, `diagnostics`) were added directly to `MatterInfo.tsx` to provide immediate feedback next to documentation.
- **Decision:** Unified Node Management.
  - *Rationale:* Commands like `ping_node`, `interview_node`, `get_node_ip_addresses`, and `open_commissioning_window` were consolidated into `Devices.tsx` for a better user experience during device inspection.
- **Decision:** Attribute Read/Write UI.
  - *Rationale:* Integrated inline attribute editing in `ClusterView` within `Devices.tsx` using `read_attribute` and `write_attribute`.

## Feature Fixes
- **Decision:** Discovery API.
  - *Rationale:* Updated `Commission.tsx` to properly handle the list of commissionable nodes returned by `discover_commissionable_nodes`.
- **Decision:** Groups Implementation.
  - *Rationale:* Created a dedicated `Groups.tsx` page to handle multicast commands and node memberships. Removed server-side group registry dependencies (which were causing "Invalid Command" errors) and replaced with a browser-based `localStorage` registry to preserve friendly naming.
- **Decision:** BLE & MAC Commissioning.
  - *Rationale:* Added support for `scan_ble_devices` and `commission_with_mac` to allow commissioning of devices via BLE MAC addresses when QR codes are unavailable.
- **Decision:** API Documentation Parity.
  - *Rationale:* Restructured `MatterInfo.tsx` to display full argument tables and response examples for all 27+ WebSocket commands, serving as an exhaustive live reference.
- **Decision:** Group Management Guardrails.
  - *Rationale:* Enforced a 16-character limit for `group_name` in `Groups.tsx` to align with Matter spec requirements, preventing server-side validation errors.
- **Decision:** Interactive Group Debugging.
  - *Rationale:* Integrated a `group_debug_info` view in the Groups management page to provide immediate visibility into raw device-side key state for troubleshooting multicast failures.
