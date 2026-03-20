import { createContext, useContext, useState, type ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { MatterNode, LogEntry, ConnectionStatus, MatterMessage } from '../types/matter';

export interface CommandsState {
  nodeId: string;
  endpointId: string;
  clusterId: string;
  commandName: string;
  payload: string;
}

interface WebSocketContextType {
  status: ConnectionStatus;
  logs: LogEntry[];
  wsUrl: string;
  setWsUrl: (url: string) => void;
  connect: (url: string) => void;
  disconnect: () => void;
  sendCommand: (command: string, args?: Record<string, unknown>) => Promise<MatterMessage>;
  onEvent: (event: string, handler: (data: unknown) => void) => () => void;
  nodes: MatterNode[];
  setNodes: (nodes: MatterNode[]) => void;
  commandsState: CommandsState;
  setCommandsState: (s: CommandsState) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const DEFAULT_COMMANDS_STATE: CommandsState = {
  nodeId: '',
  endpointId: '1',
  clusterId: '6',
  commandName: 'On',
  payload: '{}',
};

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [wsUrl, setWsUrl] = useState('ws://192.168.1.185:5580/ws');
  const [nodes, setNodes] = useState<MatterNode[]>([]);
  const [commandsState, setCommandsState] = useState<CommandsState>(DEFAULT_COMMANDS_STATE);
  const ws = useWebSocket();

  return (
    <WebSocketContext.Provider value={{ ...ws, wsUrl, setWsUrl, nodes, setNodes, commandsState, setCommandsState }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWS() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWS must be used within WebSocketProvider');
  return ctx;
}
