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
  // Legacy fields for backward compatibility
  name?: string;
  discriminator?: number;
  ip_address?: string;
}

export interface Group {
  group_id: number;
  group_name: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface LogEntry {
  id: string;
  timestamp: string;
  direction: 'send' | 'recv' | 'info' | 'error';
  data: unknown;
}
