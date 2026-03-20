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
  name?: string;
  vendor_id?: number;
  product_id?: number;
  discriminator?: number;
  ip_address?: string;
  commissioning_mode?: number;
  addresses?: string[];
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface LogEntry {
  id: string;
  timestamp: string;
  direction: 'send' | 'recv' | 'info' | 'error';
  data: unknown;
}
