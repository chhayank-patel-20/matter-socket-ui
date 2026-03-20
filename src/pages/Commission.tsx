import { useState } from 'react';
import { useWS } from '../context/WebSocketContext';
import type { DiscoveredDevice } from '../types/matter';
import { Search, Radio, CheckCircle, AlertCircle } from 'lucide-react';

export function Commission() {
  const { status, sendCommand } = useWS();
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [commissionMode, setCommissionMode] = useState<'code' | 'network'>('code');
  const [code, setCode] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [discriminator, setDiscriminator] = useState('');
  const [commissioning, setCommissioning] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [discoverError, setDiscoverError] = useState('');

  const discover = async () => {
    setDiscovering(true);
    setDiscoverError('');
    try {
      const resp = await sendCommand('discover');
      const r = (resp as { result?: DiscoveredDevice[] }).result;
      if (Array.isArray(r)) setDiscovered(r);
      else setDiscovered([]);
    } catch (e) {
      setDiscoverError(String(e));
    } finally {
      setDiscovering(false);
    }
  };

  const commission = async () => {
    setCommissioning(true);
    setResult(null);
    try {
      let resp;
      if (commissionMode === 'code') {
        resp = await sendCommand('commission_with_code', { code });
      } else {
        resp = await sendCommand('commission_on_network', {
          setup_pin_code: parseInt(pinCode),
          discriminator: parseInt(discriminator),
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
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Commission Device</h1>

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
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">{d.name || 'Unknown'}</td>
                    <td className="py-2 pr-4">{d.vendor_id ?? '—'}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{d.addresses?.[0] || d.ip_address || '—'}</td>
                    <td className="py-2">{d.discriminator ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No devices discovered yet.</p>
        )}
      </div>

      {/* Commission */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
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
  );
}
