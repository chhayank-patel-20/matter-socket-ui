import type { ConnectionStatus } from '../types/matter';

const styles: Record<ConnectionStatus, string> = {
  connected: 'bg-green-100 text-green-800 border-green-300',
  connecting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  reconnecting: 'bg-orange-100 text-orange-800 border-orange-300',
  disconnected: 'bg-red-100 text-red-800 border-red-300',
};

const dots: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-500 animate-pulse',
  reconnecting: 'bg-orange-500 animate-pulse',
  disconnected: 'bg-red-500',
};

export function StatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${styles[status]}`}>
      <span className={`w-2 h-2 rounded-full ${dots[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
