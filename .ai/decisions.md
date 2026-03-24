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
- **Decision:** Groups Integration.
  - *Rationale:* Created a dedicated `Groups.tsx` page to handle multicast commands and node memberships separately from individual device control.
