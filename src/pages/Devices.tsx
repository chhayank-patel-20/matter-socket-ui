import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWS } from '../context/WebSocketContext';
import type { MatterNode } from '../types/matter';
import { ChevronDown, ChevronRight, RefreshCw, Activity, Trash2, Info, Network, Shield, ExternalLink, Edit2, Check, X, Download } from 'lucide-react';

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

interface Fabric {
  fabric_index: number;
  vendor_id: number;
  fabric_id: number;
  node_id: number;
  label: string;
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

function ClusterView({ nodeId, endpointId, clusterId, attrs }: { nodeId: number; endpointId: number; clusterId: number; attrs: Record<number, unknown> }) {
  const { status, sendCommand } = useWS();
  const [open, setOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState<number | null>(null);

  const handleRead = async (attrId: number) => {
    setLoading(attrId);
    try {
      await sendCommand('read_attribute', {
        node_id: nodeId,
        attribute_path: `${endpointId}/${clusterId}/${attrId}`,
      });
      // The update will come via event if listening, or we might need to refresh node
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(null);
    }
  };

  const handleWrite = async (attrId: number) => {
    setLoading(attrId);
    try {
      let val: unknown = editValue;
      try {
        val = JSON.parse(editValue);
      } catch {
        // use as string
      }
      await sendCommand('write_attribute', {
        node_id: nodeId,
        attribute_path: `${endpointId}/${clusterId}/${attrId}`,
        value: val,
      });
      setEditingAttr(null);
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(null);
    }
  };

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
          {Object.entries(attrs).map(([attrIdStr, value]) => {
            const attrId = parseInt(attrIdStr);
            const isEditing = editingAttr === attrId;
            const isLoading = loading === attrId;

            return (
              <div key={attrId} className="group flex items-start gap-2 px-4 py-2 text-xs hover:bg-gray-50">
                <span className="text-gray-400 w-16 shrink-0 mt-0.5">Attr {attrId}</span>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="flex-1 px-2 py-0.5 border border-blue-300 rounded outline-none font-mono"
                        autoFocus
                      />
                      <button
                        onClick={() => handleWrite(attrId)}
                        disabled={isLoading}
                        className="text-green-600 font-bold hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingAttr(null)}
                        className="text-gray-400 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-700 font-mono break-all">{JSON.stringify(value)}</span>
                  )}
                </div>
                {!isEditing && (
                  <div className="hidden group-hover:flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRead(attrId)}
                      disabled={status !== 'connected' || isLoading}
                      className="text-blue-500 hover:text-blue-700"
                      title="Read Attribute"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingAttr(attrId);
                        setEditValue(JSON.stringify(value));
                      }}
                      disabled={status !== 'connected' || isLoading}
                      className="text-gray-400 hover:text-gray-600"
                      title="Write Attribute"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EndpointView({ nodeId, ep }: { nodeId: number; ep: EndpointData }) {
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
            <ClusterView
              key={clusterId}
              nodeId={nodeId}
              endpointId={ep.endpointId}
              clusterId={parseInt(clusterId)}
              attrs={attrs as Record<number, unknown>}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Devices() {
  const { status, sendCommand, nodes, setNodes } = useWS();
  const [searchParams] = useSearchParams();
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [nodeData, setNodeData] = useState<MatterNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [ipAddresses, setIpAddresses] = useState<string[]>([]);
  const [commissioningCode, setCommissioningCode] = useState<string | null>(null);
  const [editingFabricLabel, setEditingFabricLabel] = useState(false);
  const [newFabricLabel, setNewFabricLabel] = useState('');
  const [aclEntries, setAclEntries] = useState<string>('[]');
  const [nodeBindings, setNodeBindings] = useState<string>('[]');
  const [otaLoading, setOtaLoading] = useState(false);
  const [otaUpdateInfo, setOtaUpdateInfo] = useState<unknown | null>(null);

  // Binding Add State
  const [targetNodeId, setTargetNodeId] = useState('');
  const [targetEndpointId, setTargetEndpointId] = useState('1');
  const [bindingClusterId, setBindingClusterId] = useState('6');
  const [bindingSourceEndpoint, setBindingSourceEndpoint] = useState('1');

  useEffect(() => {
    const nodeParam = searchParams.get('node');
    if (nodeParam) setSelectedNodeId(parseInt(nodeParam));
  }, [searchParams]);

  useEffect(() => {
    if (selectedNodeId !== null && status === 'connected') {
      loadNode(selectedNodeId);
      setFabrics([]);
      setIpAddresses([]);
      setCommissioningCode(null);
      setEditingFabricLabel(false);
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

  const handleOta = async (command: string, args: Record<string, unknown> = {}) => {
    setOtaLoading(true);
    setError('');
    try {
      const resp = await sendCommand(command, { node_id: selectedNodeId, ...args });
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setError(r.details || r.error_code);
      } else {
        if (command === 'check_node_update') setOtaUpdateInfo(r.result);
        if (command === 'update_node') {
          alert('Update triggered!');
          setOtaUpdateInfo(null);
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setOtaLoading(false);
    }
  };

  const handleAction = async (command: string, args: Record<string, unknown> = {}) => {
    setActionLoading(command);
    setError('');
    try {
      const resp = await sendCommand(command, { node_id: selectedNodeId, ...args });
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setError(r.details || r.error_code);
      } else {
        if (command === 'get_fabrics') setFabrics(r.result as Fabric[]);
        if (command === 'get_node_ip_addresses') setIpAddresses(r.result as string[]);
        if (command === 'open_commissioning_window') setCommissioningCode(String(r.result));
        if (command === 'remove_node') {
          setSelectedNodeId(null);
          setNodes(nodes.filter(n => n.node_id !== selectedNodeId));
        }
        if (command === 'update_fabric_label') {
          setEditingFabricLabel(false);
          loadNode(selectedNodeId!);
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setActionLoading(null);
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
        <div className="space-y-6">
          {/* Node Summary & Actions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Node {nodeData.node_id}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${nodeData.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {nodeData.available ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Last Interview: {new Date(nodeData.last_interview).toLocaleString()}</span>
              </div>
            </div>
            <div className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Management</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAction('interview_node')}
                    disabled={status !== 'connected' || actionLoading === 'interview_node'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Info className="w-4 h-4" /> Interview
                  </button>
                  <button
                    onClick={() => handleAction('ping_node')}
                    disabled={status !== 'connected' || actionLoading === 'ping_node'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Activity className="w-4 h-4" /> Ping
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this node?')) handleAction('remove_node');
                    }}
                    disabled={status !== 'connected' || actionLoading === 'remove_node'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> Remove Node
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Network & Commissioning</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAction('get_node_ip_addresses')}
                    disabled={status !== 'connected' || actionLoading === 'get_node_ip_addresses'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Network className="w-4 h-4" /> Get IP Addresses
                  </button>
                  <button
                    onClick={() => handleAction('open_commissioning_window')}
                    disabled={status !== 'connected' || actionLoading === 'open_commissioning_window'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    <ExternalLink className="w-4 h-4" /> Open Comm. Window
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fabrics</h3>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleAction('get_fabrics')}
                    disabled={status !== 'connected' || actionLoading === 'get_fabrics'}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Shield className="w-4 h-4" /> List Fabrics
                  </button>
                  <div className="flex items-center gap-2">
                    {editingFabricLabel ? (
                      <div className="flex gap-1 w-full">
                        <input
                          type="text"
                          value={newFabricLabel}
                          onChange={e => setNewFabricLabel(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none"
                          placeholder="New label"
                        />
                        <button
                          onClick={() => handleAction('update_fabric_label', { label: newFabricLabel })}
                          className="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setEditingFabricLabel(false)}
                          className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingFabricLabel(true);
                          setNewFabricLabel('');
                        }}
                        className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                      >
                        <Edit2 className="w-4 h-4" /> Update Label
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bindings & ACL Section */}
            <div className="px-6 pb-6 pt-6 border-t border-gray-100 space-y-6">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Bindings */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Node Bindings</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase">Src EP</label>
                      <input type="number" value={bindingSourceEndpoint} onChange={e => setBindingSourceEndpoint(e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase">Target Node</label>
                      <input type="number" value={targetNodeId} onChange={e => setTargetNodeId(e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase">Target EP</label>
                      <input type="number" value={targetEndpointId} onChange={e => setTargetEndpointId(e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase">Cluster ID</label>
                      <input type="number" value={bindingClusterId} onChange={e => setBindingClusterId(e.target.value)} className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('binding_add', {
                        endpoint_id: parseInt(bindingSourceEndpoint),
                        target_node_id: parseInt(targetNodeId),
                        target_endpoint_id: parseInt(targetEndpointId),
                        cluster_id: parseInt(bindingClusterId)
                      })}
                      disabled={status !== 'connected' || !!actionLoading || !targetNodeId}
                      className="flex-1 py-1.5 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100"
                    >
                      Add Binding
                    </button>
                    <button
                      onClick={() => handleAction('binding_remove', {
                        endpoint_id: parseInt(bindingSourceEndpoint),
                        target_node_id: parseInt(targetNodeId),
                        target_endpoint_id: parseInt(targetEndpointId),
                        cluster_id: parseInt(bindingClusterId)
                      })}
                      disabled={status !== 'connected' || !!actionLoading || !targetNodeId}
                      className="flex-1 py-1.5 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100"
                    >
                      Remove Binding
                    </button>
                  </div>
                  <div className="pt-2 space-y-2">
                    <label className="block text-[10px] text-gray-400 uppercase font-bold">Raw Bindings List (JSON)</label>
                    <textarea
                      value={nodeBindings}
                      onChange={e => setNodeBindings(e.target.value)}
                      className="w-full h-20 p-2 border border-gray-200 rounded text-[10px] font-mono"
                      placeholder="[]"
                    />
                    <button
                      onClick={() => handleAction('set_node_binding', { endpoint: parseInt(bindingSourceEndpoint), bindings: JSON.parse(nodeBindings) })}
                      disabled={status !== 'connected' || !!actionLoading}
                      className="w-full py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200"
                    >
                      Set Node Binding List
                    </button>
                  </div>
                </div>

                {/* ACL */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-red-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Access Control (ACL)</h3>
                  </div>
                  <p className="text-[10px] text-gray-500">Configure ACL entries for this node. CAUTION: Incorrect settings can lock you out.</p>
                  <textarea
                    value={aclEntries}
                    onChange={e => setAclEntries(e.target.value)}
                    className="w-full h-40 p-2 border border-gray-200 rounded text-[10px] font-mono"
                    placeholder="[ { ... } ]"
                  />
                  <button
                    onClick={() => handleAction('set_acl_entry', { entry: JSON.parse(aclEntries) })}
                    disabled={status !== 'connected' || !!actionLoading}
                    className="w-full py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
                  >
                    Set ACL Entries
                  </button>
                </div>
              </div>
            </div>

            {/* OTA Updates Section */}
            <div className="px-6 pb-6 pt-6 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-orange-600" />
                <h3 className="text-sm font-semibold text-gray-800">OTA Software Updates</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOta('check_node_update')}
                  disabled={status !== 'connected' || otaLoading}
                  className="px-4 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 cursor-pointer"
                >
                  {otaLoading ? 'Checking...' : 'Check for Updates'}
                </button>
                {!!otaUpdateInfo && (
                  <button
                    onClick={() => {
                      const info = otaUpdateInfo as { software_version?: number };
                      if (info.software_version)
                        handleOta('update_node', { software_version: info.software_version });
                    }}
                    disabled={status !== 'connected' || otaLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer"
                  >
                    Install Update
                  </button>
                )}
              </div>
              {!!otaUpdateInfo && (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <p className="text-xs font-bold text-gray-700 mb-1">Update Info:</p>
                  <pre className="text-[10px] font-mono text-gray-600 overflow-x-auto">{JSON.stringify(otaUpdateInfo, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Results Display */}
            {(ipAddresses.length > 0 || fabrics.length > 0 || commissioningCode) && (
              <div className="px-6 pb-6 pt-2 border-t border-gray-100 grid gap-4 sm:grid-cols-2">
                {ipAddresses.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-blue-800 mb-1">IP Addresses</h4>
                    <ul className="text-xs font-mono text-blue-700 space-y-0.5">
                      {ipAddresses.map(ip => <li key={ip}>{ip}</li>)}
                    </ul>
                  </div>
                )}
                {commissioningCode && (
                  <div className="bg-green-50 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-green-800 mb-1">Commissioning Code</h4>
                    <p className="text-lg font-mono font-bold text-green-900">{commissioningCode}</p>
                  </div>
                )}
                {fabrics.length > 0 && (
                  <div className="col-span-full bg-purple-50 rounded-lg p-3">
                    <h4 className="text-xs font-bold text-purple-800 mb-2">Commissioned Fabrics</h4>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {fabrics.map(f => (
                        <div key={f.fabric_index} className="bg-white border border-purple-100 rounded p-2 flex justify-between items-start">
                          <div>
                            <p className="text-xs font-bold text-purple-900">{f.label || '(No label)'}</p>
                            <p className="text-[10px] text-purple-500">Index: {f.fabric_index} · VID: {f.vendor_id}</p>
                            <p className="text-[10px] text-purple-500">Fabric ID: {f.fabric_id}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Remove fabric index ${f.fabric_index}?`))
                                handleAction('remove_fabric', { fabric_index: f.fabric_index });
                            }}
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Endpoints & Attributes</h2>
              <span className="text-xs text-gray-400">{endpoints.length} endpoint{endpoints.length !== 1 ? 's' : ''}</span>
            </div>
            {endpoints.length === 0 ? (
              <p className="text-gray-500 text-sm">No endpoint data found.</p>
            ) : (
              endpoints.map(ep => <EndpointView key={ep.endpointId} nodeId={selectedNodeId!} ep={ep} />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}
