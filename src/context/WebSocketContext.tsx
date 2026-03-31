import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
  const [wsUrl, setWsUrl] = useState('ws://10.81.3.38:5580/ws');
  const [nodes, setNodes] = useState<MatterNode[]>([]);
  const [commandsState, setCommandsState] = useState<CommandsState>(DEFAULT_COMMANDS_STATE);
  const ws = useWebSocket();

  const { status, sendCommand, onEvent } = ws;

  useEffect(() => {
    if (status === 'connected') {
      // Auto-start listening on connect to get initial nodes and real-time updates
      sendCommand('start_listening')
        .then(resp => {
          const result = (resp as { result?: { nodes: MatterNode[] } }).result;
          if (result?.nodes) setNodes(result.nodes);
        })
        .catch(err => console.error('Failed to start listening:', err));
    } else if (status === 'disconnected') {
      setNodes([]);
    }
  }, [status, sendCommand]);

  useEffect(() => {
    const unsubs = [
      onEvent('node_added', (data) => {
        const newNode = data as MatterNode;
        setNodes(prev => {
          if (prev.find(n => n.node_id === newNode.node_id)) return prev;
          return [...prev, newNode];
        });
      }),
      onEvent('node_updated', (data) => {
        const updatedNode = data as Partial<MatterNode> & { node_id: number };
        setNodes(prev => prev.map(n => 
          n.node_id === updatedNode.node_id ? { ...n, ...updatedNode } : n
        ));
      }),
      onEvent('node_removed', (data) => {
        const nodeId = data as number;
        setNodes(prev => prev.filter(n => n.node_id !== nodeId));
      }),
      onEvent('attribute_updated', (data) => {
        const [nodeId, attributePath, value] = data as [number, string, unknown];
        setNodes(prev => prev.map(n => {
          if (n.node_id !== nodeId) return n;
          return {
            ...n,
            attributes: {
              ...n.attributes,
              [attributePath]: value
            }
          };
        }));
      })
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, [onEvent]);

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
