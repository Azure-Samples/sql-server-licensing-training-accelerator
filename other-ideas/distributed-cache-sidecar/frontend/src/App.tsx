import React, { useState, useEffect } from 'react';
import { Activity, Server, Database, Users, RefreshCw, Plus, Trash2 } from 'lucide-react';
import './App.css';

interface CacheItem {
  key: string;
  value: string;
  region: string;
  node_id: string;
  timestamp: string;
  ttl: number;
}

interface CacheStats {
  total_items: number;
  local_items: number;
  remote_items: number;
  hit_count: number;
  miss_count: number;
  last_updated: string;
}

interface Peer {
  Address: string;
  Region: string;
  Connected: boolean;
  LastSeen: string;
}

interface StatusData {
  stats: CacheStats;
  peers: Peer[];
  items: CacheItem[];
}

function App() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newTTL, setNewTTL] = useState(0);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const API_USER = import.meta.env.VITE_API_USER || '';
  const API_PASSWORD = import.meta.env.VITE_API_PASSWORD || '';
  
  const getApiConfig = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (API_USER && API_PASSWORD) {
      const credentials = btoa(`${API_USER}:${API_PASSWORD}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    return { baseUrl: `https://${API_URL}`, headers };
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const { baseUrl } = getApiConfig();
      const callbackName = `jsonp_callback_${Date.now()}`;
      
      return new Promise((resolve, reject) => {
        (window as any)[callbackName] = (data: any) => {
          setStatusData(data);
          setConnected(true);
          delete (window as any)[callbackName];
          document.head.removeChild(script);
          resolve(data);
        };
        
        const script = document.createElement('script');
        script.src = `${baseUrl}/jsonp?callback=${callbackName}`;
        script.onerror = () => {
          setConnected(false);
          delete (window as any)[callbackName];
          document.head.removeChild(script);
          reject(new Error('JSONP request failed'));
        };
        
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('Failed to fetch status:', error);
      setConnected(false);
    }
  };

  const addCacheItem = async () => {
    if (!newKey || !newValue) return;
    
    setLoading(true);
    try {
      const { baseUrl } = getApiConfig();
      const response = await fetch(`${baseUrl}/proxy?path=/api/cache/${encodeURIComponent(newKey)}&method=POST`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: newValue,
          ttl: newTTL,
        }),
      });

      if (response.ok) {
        setNewKey('');
        setNewValue('');
        setNewTTL(0);
        fetchStatus();
      }
    } catch (error) {
      console.error('Failed to add cache item:', error);
    }
    setLoading(false);
  };

  const deleteCacheItem = async (key: string) => {
    try {
      const { baseUrl } = getApiConfig();
      await fetch(`${baseUrl}/proxy?path=/api/cache/${encodeURIComponent(key)}&method=DELETE`, {
        method: 'DELETE',
      });
      fetchStatus();
    } catch (error) {
      console.error('Failed to delete cache item:', error);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getConnectionStatus = () => {
    if (!connected) return 'text-red-500';
    return 'text-green-500';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Distributed Cache Sidecar
          </h1>
          <p className="text-gray-600">
            Multi-region distributed cache with TCP socket communication
          </p>
          <div className="flex items-center mt-4">
            <div className={`w-3 h-3 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={getConnectionStatus()}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {statusData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Database className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-gray-900">{statusData.stats.total_items}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Server className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Local Items</p>
                    <p className="text-2xl font-bold text-gray-900">{statusData.stats.local_items}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Remote Items</p>
                    <p className="text-2xl font-bold text-gray-900">{statusData.stats.remote_items}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-orange-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Hit Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {statusData.stats.hit_count + statusData.stats.miss_count > 0
                        ? Math.round((statusData.stats.hit_count / (statusData.stats.hit_count + statusData.stats.miss_count)) * 100)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Connected Peers</h2>
                </div>
                <div className="p-6">
                  {statusData.peers.length === 0 ? (
                    <p className="text-gray-500">No peers connected</p>
                  ) : (
                    <div className="space-y-4">
                      {statusData.peers.map((peer, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{peer.Address}</p>
                            <p className="text-sm text-gray-600">Region: {peer.Region || 'Unknown'}</p>
                          </div>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${peer.Connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`text-sm ${peer.Connected ? 'text-green-600' : 'text-red-600'}`}>
                              {peer.Connected ? 'Connected' : 'Disconnected'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Add Cache Item</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                      <input
                        type="text"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter cache key"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                      <input
                        type="text"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter cache value"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">TTL (seconds, 0 = no expiry)</label>
                      <input
                        type="number"
                        value={newTTL}
                        onChange={(e) => setNewTTL(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <button
                      onClick={addCacheItem}
                      disabled={loading || !newKey || !newValue}
                      className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {loading ? 'Adding...' : 'Add Item'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Cache Items</h2>
                <button
                  onClick={fetchStatus}
                  className="flex items-center px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Region</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Node</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TTL</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {statusData.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No cache items found
                        </td>
                      </tr>
                    ) : (
                      statusData.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.key}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">{item.value}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.region}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.node_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.ttl === 0 ? 'Never' : `${item.ttl}s`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTimestamp(item.timestamp)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <button
                              onClick={() => deleteCacheItem(item.key)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!connected && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-red-500 mb-4">
              <Server className="h-16 w-16 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Connect</h2>
            <p className="text-gray-600 mb-4">
              Cannot connect to the cache service at {getApiConfig().baseUrl}
            </p>
            <button
              onClick={fetchStatus}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry Connection
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
