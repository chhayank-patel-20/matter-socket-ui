import { useState, useEffect } from 'react';
import { useWS } from '../context/WebSocketContext';
import type { DiscoveredDevice } from '../types/matter';
import { Search, Radio, CheckCircle, AlertCircle, Wifi, Cpu, Tag, Settings, MousePointer2 } from 'lucide-react';

export function Commission() {
  const { status, sendCommand, onEvent } = useWS();
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [commissionMode, setCommissionMode] = useState<'code' | 'network'>('code');
  const [code, setCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [discriminator, setDiscriminator] = useState('');
  const [commissioning, setCommissioning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [discoverError, setDiscoverError] = useState('');
  const [commissioningStage, setCommissioningStage] = useState<string | null>(null);

  // Setup state
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [threadDataset, setThreadDataset] = useState('');
  const [fabricLabel, setFabricLabel] = useState('');
  const [setupLoading, setSetupLoading] = useState<string | null>(null);
  const [setupResult, setSetupResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Listen for discovery updates
    const unbindDiscovery = onEvent('discovery_updated', (data: any) => {
      if (data.removed) {
        setDiscovered(prev => prev.filter(d => (d.instance_name || d.name) !== data.name));
      } else {
        setDiscovered(prev => {
          const index = prev.findIndex(d => (d.instance_name || d.name) === (data.instance_name || data.name));
          if (index >= 0) {
            const next = [...prev];
            next[index] = data;
            return next;
          }
          return [...prev, data];
        });
      }
    });

    // Listen for commissioning progress
    const unbindProgress = onEvent('commissioning_progress', (data: any) => {
      if (data.stage) {
        setCommissioningStage(data.stage);
      }
    });

    return () => {
      unbindDiscovery();
      unbindProgress();
    };
  }, [onEvent]);

  const discover = async () => {
    setDiscovering(true);
    setDiscoverError('');
    try {
      const resp = await sendCommand('discover_commissionable_nodes');
      const r = (resp as { result?: DiscoveredDevice[] }).result;
      if (Array.isArray(r)) setDiscovered(r);
      else setDiscovered([]);
    } catch (e) {
      setDiscoverError(String(e));
    } finally {
      setDiscovering(false);
    }
  };

  const selectDevice = (device: DiscoveredDevice) => {
    setCommissionMode('network');
    setDiscriminator(String(device.long_discriminator ?? device.discriminator ?? ''));
    // Scroll to commission form
    window.scrollTo({ top: document.getElementById('commission-form')?.offsetTop ? document.getElementById('commission-form')!.offsetTop - 20 : 0, behavior: 'smooth' });
  };

  const commission = async () => {
    setCommissioning(true);
    setResult(null);
    setCommissioningStage('Starting...');
    try {
      let resp;
      if (commissionMode === 'code') {
        resp = await sendCommand('commission_with_code', { code });
      } else {
        resp = await sendCommand('commission_on_network', {
          setup_pin_code: parseInt(pinCode),
          filter_type: discriminator ? 5 : 0, // 5 = Long Discriminator
          filter: discriminator ? parseInt(discriminator) : null,
        });
      }
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setResult({ success: false, message: r.details || r.error_code });
      } else {
        setResult({ success: true, message: `Device commissioned successfully! Node ID: ${r.result}` });
      }
    } catch (e) {
      setResult({ success: false, message: String(e) });
    } finally {
      setCommissioning(false);
      setCommissioningStage(null);
    }
  };

  const handleSetup = async (command: string, args: Record<string, unknown>) => {
    setSetupLoading(command);
    setSetupResult(null);
    try {
      const resp = await sendCommand(command, args);
      const r = resp as { result?: unknown; error_code?: string; details?: string };
      if (r.error_code) {
        setSetupResult({ success: false, message: r.details || r.error_code });
      } else {
        setSetupResult({ success: true, message: 'Settings updated successfully!' });
      }
    } catch (e) {
      setSetupResult({ success: false, message: String(e) });
    } finally {
      setSetupLoading(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-gray-900">Commission Device</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Discovery */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Discover Devices</h2>
                <p className="text-xs text-gray-500 mt-0.5">Scan for devices available for commissioning</p>
              </div>
              <button
                onClick={discover}
                disabled={status !== 'connected' || discovering}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
              >
                <Search className={`w-4 h-4 ${discovering ? 'animate-pulse' : ''}`} />
                {discovering ? 'Discovering...' : 'Discover'}
              </button>
            </div>

            {discoverError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{discoverError}</p>
            )}

            {discovered.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Vendor ID</th>
                      <th className="pb-2 pr-4 font-medium">IP Address</th>
                      <th className="pb-2 font-medium">Discriminator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discovered.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 group">
                        <td className="py-2 pr-4 font-medium">{d.device_name || d.name || 'Unknown'}</td>
                        <td className="py-2 pr-4">{d.vendor_id ?? '—'}</td>
                        <td className="py-2 pr-4 font-mono text-xs text-gray-500">{d.addresses?.[0] || d.ip_address || '—'}</td>
                        <td className="py-2 pr-4 font-mono">{d.long_discriminator ?? d.discriminator ?? '—'}</td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => selectDevice(d)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Select for commissioning"
                          >
                            <MousePointer2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No devices discovered yet. Click "Discover" to scan.</p>
            )}
          </div>

          {/* Commission */}
          <div id="commission-form" className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Commission Device</h2>
              <p className="text-xs text-gray-500 mt-0.5">Pair a new device to this Matter controller</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCommissionMode('code')}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${commissionMode === 'code' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Setup Code / QR
              </button>
              <button
                onClick={() => setCommissionMode('network')}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${commissionMode === 'network' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                On Network
              </button>
            </div>

            {commissionMode === 'code' ? (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Setup Code or QR Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="MT:XXXXXXXX or 11-digit numeric code"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">PIN Code</label>
                  <input
                    type="number"
                    value={pinCode}
                    onChange={e => setPinCode(e.target.value)}
                    placeholder="12345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Discriminator</label>
                  <input
                    type="number"
                    value={discriminator}
                    onChange={e => setDiscriminator(e.target.value)}
                    placeholder="1024"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              onClick={commission}
              disabled={status !== 'connected' || commissioning}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 cursor-pointer"
            >
              <Radio className={`w-4 h-4 ${commissioning ? 'animate-pulse' : ''}`} />
              {commissioning ? 'Commissioning...' : 'Commission Device'}
            </button>

            {commissioningStage && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-100">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span className="font-medium">Commissioning Stage: {commissioningStage}</span>
              </div>
            )}

            {result && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {result.success
                  ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                }
                {result.message}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Commissioning Setup */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Setup</h2>
            </div>

            {setupResult && (
              <div className={`flex items-start gap-2 p-2 rounded text-xs ${setupResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {setupResult.success ? <CheckCircle className="w-3 h-3 mt-0.5" /> : <AlertCircle className="w-3 h-3 mt-0.5" />}
                {setupResult.message}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                  <Wifi className="w-3 h-3" /> WiFi Credentials
                </div>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={e => setWifiSsid(e.target.value)}
                  placeholder="SSID"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <input
                  type="password"
                  value={wifiPassword}
                  onChange={e => setWifiPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => handleSetup('set_wifi_credentials', { ssid: wifiSsid, credentials: wifiPassword })}
                  disabled={status !== 'connected' || !!setupLoading}
                  className="w-full py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {setupLoading === 'set_wifi_credentials' ? 'Saving...' : 'Set WiFi'}
                </button>
              </div>

              <hr className="border-gray-100" />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                  <Cpu className="w-3 h-3" /> Thread Dataset
                </div>
                <textarea
                  value={threadDataset}
                  onChange={e => setThreadDataset(e.target.value)}
                  placeholder="Hex dataset"
                  rows={2}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
                <button
                  onClick={() => handleSetup('set_thread_dataset', { dataset: threadDataset })}
                  disabled={status !== 'connected' || !!setupLoading}
                  className="w-full py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {setupLoading === 'set_thread_dataset' ? 'Saving...' : 'Set Thread'}
                </button>
              </div>

              <hr className="border-gray-100" />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                  <Tag className="w-3 h-3" /> Default Fabric Label
                </div>
                <input
                  type="text"
                  value={fabricLabel}
                  onChange={e => setFabricLabel(e.target.value)}
                  placeholder="My Home"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => handleSetup('set_default_fabric_label', { label: fabricLabel })}
                  disabled={status !== 'connected' || !!setupLoading}
                  className="w-full py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  {setupLoading === 'set_default_fabric_label' ? 'Saving...' : 'Set Label'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
