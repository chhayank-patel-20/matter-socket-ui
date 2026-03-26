export interface MatterMessage {
  message_id: string;
  command?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  error_code?: string;
  details?: string;
}

export interface MatterNode {
  node_id: number;
  date_commissioned: string;
  last_interview: string;
  interview_version: number;
  is_controllable: boolean;
  attributes: Record<string, unknown>;
  available: boolean;
}

export interface DiscoveredDevice {
  instance_name?: string;
  host_name?: string;
  port?: number;
  long_discriminator?: number;
  vendor_id?: number;
  product_id?: number;
  commissioning_mode?: number;
  device_type?: number;
  device_name?: string;
  pairing_instruction?: string;
  pairing_hint?: number;
  addresses?: string[];
  // BLE specific fields
  address?: string;
  rssi?: number;
  is_matter?: boolean;
  matter_discriminator?: number | null;
  matter_vendor_id?: number | null;
  matter_product_id?: number | null;
  // Legacy fields for backward compatibility
  name?: string;
  discriminator?: number;
  ip_address?: string;
}

export interface BleDevice {
  address: string;
  name: string;
  rssi: number;
  service_uuids: string[];
  service_data: Record<string, string>;
  manufacturer_data: Record<string, string>;
  is_matter: boolean;
  matter_discriminator: number | null;
  matter_vendor_id: number | null;
  matter_product_id: number | null;
}

export interface Group {
  group_id: number;
  group_name: string;
}

export interface NodeGroupMembership {
  node_id: number;
  endpoint: number;
  remaining_capacity: number | null;
  groups: {
    group_id: number;
    group_name: string | null;
  }[];
}

export interface GroupDebugInfo {
  node_id: number;
  group_key_map: {
    group_id: number;
    keyset_id: number;
  }[];
  controller_tracked_keysets: number[];
  inferred_orphaned_keysets: number[];
  group_key_store_entries: {
    group_id: number;
    keyset_id: number;
  }[];
  provisioned_nodes_for_group: Record<string, number[]>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface LogEntry {
  id: string;
  timestamp: string;
  direction: 'send' | 'recv' | 'info' | 'error';
  data: unknown;
}
