import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWS } from '../context/WebSocketContext';
import type { MatterNode } from '../types/matter';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

const CLUSTER_NAMES: Record<number, string> = {
  3: 'Identify',
  4: 'Groups',
  5: 'Scenes',
  6: 'OnOff',
  8: 'LevelControl',
  15: 'BinaryInputBasic',
  29: 'Descriptor',
  30: 'Binding',
  31: 'AccessControl',
  40: 'BasicInformation',
  41: 'OtaSoftwareUpdateProvider',
  42: 'OtaSoftwareUpdateRequestor',
  43: 'LocalizationConfiguration',
  44: 'TimeFormatLocalization',
  46: 'PowerSourceConfiguration',
  47: 'PowerSource',
  48: 'GeneralCommissioning',
  49: 'NetworkCommissioning',
  50: 'DiagnosticLogs',
  51: 'GeneralDiagnostics',
  52: 'SoftwareDiagnostics',
  60: 'AdministratorCommissioning',
  62: 'OperationalCredentials',
  63: 'GroupKeyManagement',
  64: 'FixedLabel',
  65: 'UserLabel',
  768: 'ColorControl',
  1024: 'IlluminanceMeasurement',
  1026: 'TemperatureMeasurement',
  1028: 'PressureMeasurement',
  1029: 'FlowMeasurement',
  1030: 'RelativeHumidityMeasurement',
  1280: 'OccupancySensing',
};

function clusterLabel(id: number) {
  return CLUSTER_NAMES[id] ? `${CLUSTER_NAMES[id]} (${id})` : `Cluster ${id}`;
}

interface EndpointData {
  endpointId: number;
  clusters: Record<number, Record<number, unknown>>;
}

function parseAttributes(attributes: Record<string, unknown>): EndpointData[] {
  const endpoints: Record<number, Record<number, Record<number, unknown>>> = {};
  for (const [key, value] of Object.entries(attributes)) {
    const parts = key.split('/');
    if (parts.length < 3) continue;
    const ep = parseInt(parts[0]);
    const cluster = parseInt(parts[1]);
    const attr = parseInt(parts[2]);
    if (!endpoints[ep]) endpoints[ep] = {};
    if (!endpoints[ep][cluster]) endpoints[ep][cluster] = {};
    endpoints[ep][cluster][attr] = value;
  }
  return Object.entries(endpoints)
    .map(([ep, clusters]) => ({ endpointId: parseInt(ep), clusters }))
    .sort((a, b) => a.endpointId - b.endpointId);
}

function ClusterView({ clusterId, attrs }: { clusterId: number; attrs: Record<number, unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left text-sm font-medium text-gray-700 cursor-pointer"
      >
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        {clusterLabel(clusterId)}
        <span className="ml-auto text-xs text-gray-400">{Object.keys(attrs).length} attrs</span>
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {Object.entries(attrs).map(([attrId, value]) => (
            <div key={attrId} className="flex items-start gap-2 px-4 py-1.5 text-xs">
              <span className="text-gray-400 w-16 shrink-0">Attr {attrId}</span>
              <span className="text-gray-700 font-mono break-all">{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EndpointView({ ep }: { ep: EndpointData }) {
  const [open, setOpen] = useState(true);
  const clusterCount = Object.keys(ep.clusters).length;
  return (
    <div className="border border-blue-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-left cursor-pointer"
      >
        {open ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
        <span className="font-semibold text-blue-800">Endpoint {ep.endpointId}</span>
        <span className="ml-auto text-xs text-blue-500">{clusterCount} cluster{clusterCount !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div className="p-3 space-y-2">
          {Object.entries(ep.clusters).map(([clusterId, attrs]) => (
            <ClusterView key={clusterId} clusterId={parseInt(clusterId)} attrs={attrs as Record<number, unknown>} />
          ))}
        </div>
      )}
    </div>
  );
}

export function Devices() {
  const { status, sendCommand, nodes } = useWS();
  const [searchParams] = useSearchParams();
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [nodeData, setNodeData] = useState<MatterNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const nodeParam = searchParams.get('node');
    if (nodeParam) setSelectedNodeId(parseInt(nodeParam));
  }, [searchParams]);

  useEffect(() => {
    if (selectedNodeId !== null && status === 'connected') {
      loadNode(selectedNodeId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId, status]);

  const loadNode = async (nodeId: number) => {
    setLoading(true);
    setError('');
    try {
      const resp = await sendCommand('get_node', { node_id: nodeId });
      const r = resp as { result?: MatterNode; error_code?: string; details?: string };
      if (r.error_code) setError(r.details || r.error_code);
      else if (r.result) setNodeData(r.result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const endpoints = nodeData ? parseAttributes(nodeData.attributes) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Device Inspector</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Select Node</label>
            <select
              value={selectedNodeId ?? ''}
              onChange={e => setSelectedNodeId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a node...</option>
              {nodes.map(n => (
                <option key={n.node_id} value={n.node_id}>
                  Node {n.node_id} {n.available ? '(Online)' : '(Offline)'}
                </option>
              ))}
            </select>
          </div>
          {selectedNodeId !== null && (
            <button
              onClick={() => loadNode(selectedNodeId)}
              disabled={status !== 'connected' || loading}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {nodes.length === 0 && (
          <p className="text-xs text-gray-400">No nodes loaded — go to Dashboard and click Refresh to load nodes.</p>
        )}
      </div>

      {nodeData && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Node {nodeData.node_id}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nodeData.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {nodeData.available ? 'Online' : 'Offline'}
            </span>
            <span className="text-xs text-gray-400">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</span>
          </div>
          {endpoints.length === 0 ? (
            <p className="text-gray-500 text-sm">No endpoint data found.</p>
          ) : (
            endpoints.map(ep => <EndpointView key={ep.endpointId} ep={ep} />)
          )}
        </div>
      )}
    </div>
  );
}
