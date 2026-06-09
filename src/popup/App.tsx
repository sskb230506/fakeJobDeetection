import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Settings, 
  History, 
  Trash2, 
  ExternalLink, 
  Briefcase, 
  AlertTriangle, 
  CheckCircle, 
  Sliders, 
  ChevronRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { JobDetails, AnalysisResult, ExtensionSettings, ScanHistoryItem } from '../utils/types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'settings'>('scan');
  const [settings, setSettings] = useState<ExtensionSettings>({
    enabled: true,
    autoAlert: true,
    strictMode: false
  });
  
  const [lastScan, setLastScan] = useState<ScanHistoryItem | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ScanHistoryItem | null>(null);

  // Load state from Background / Storage
  const loadData = async () => {
    setIsLoading(true);
    
    // Get Settings
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
      if (response) setSettings(response);
    });

    // Get Last Scan
    chrome.runtime.sendMessage({ type: 'GET_LAST_SCAN' }, (response) => {
      if (response) setLastScan(response);
    });

    // Get History
    chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
      if (response) setHistory(response);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleSetting = (key: keyof ExtensionSettings) => {
    const updatedSettings = {
      ...settings,
      [key]: !settings[key]
    };
    setSettings(updatedSettings);
    
    chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      payload: updatedSettings
    }, (response) => {
      if (response?.success) {
        console.log('Settings saved:', updatedSettings);
      }
    });
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear scan history?')) {
      chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, (response) => {
        if (response?.success) {
          setHistory([]);
          setLastScan(null);
        }
      });
    }
  };

  // Helper to get status-specific colors
  const getStatusColor = (status: 'safe' | 'suspicious' | 'danger') => {
    switch(status) {
      case 'danger':
        return {
          bg: 'bg-rose-50 border-rose-200',
          text: 'text-rose-600',
          badge: 'bg-rose-500 text-white',
          border: 'border-rose-500',
          darkText: 'text-rose-950',
          lightBg: 'bg-rose-100/50'
        };
      case 'suspicious':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-600',
          badge: 'bg-amber-500 text-amber-950',
          border: 'border-amber-500',
          darkText: 'text-amber-950',
          lightBg: 'bg-amber-100/50'
        };
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          text: 'text-emerald-600',
          badge: 'bg-emerald-500 text-white',
          border: 'border-emerald-500',
          darkText: 'text-emerald-950',
          lightBg: 'bg-emerald-100/50'
        };
    }
  };

  return (
    <div className="w-[400px] h-[550px] bg-slate-50 flex flex-col font-sans select-none overflow-hidden border border-slate-200/50">
      {/* Top Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-violet-700 text-white px-5 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold text-white text-md shadow-sm border border-white/10">
            VW
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight m-0">VeriWork AI</h1>
            <p className="text-[10px] text-indigo-100/80 m-0">Job listing trust guardian</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${settings.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
          <button 
            onClick={loadData}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Refresh Scan Status"
          >
            <RefreshCw className="w-4 h-4 text-white" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-y-auto px-4 py-3.5">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs">Loading logs...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: ACTIVE SCAN */}
            {activeTab === 'scan' && (
              <div className="space-y-4">
                {lastScan ? (
                  <div className="space-y-4">
                    {/* Score Circle Panel */}
                    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Active Listing</span>
                      </div>

                      {/* Circular Gauge */}
                      <div className="relative w-32 h-32 flex items-center justify-center mt-3">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          {/* Track */}
                          <circle 
                            cx="50" cy="50" r="40" 
                            className="stroke-slate-100" 
                            strokeWidth="10" 
                            fill="transparent" 
                          />
                          {/* Bar */}
                          <circle 
                            cx="50" cy="50" r="40" 
                            className={`transition-all duration-1000 ease-out ${
                              lastScan.result.status === 'danger' 
                                ? 'stroke-rose-500' 
                                : lastScan.result.status === 'suspicious' 
                                ? 'stroke-amber-500' 
                                : 'stroke-emerald-500'
                            }`} 
                            strokeWidth="10" 
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - lastScan.result.trustScore / 100)}
                            strokeLinecap="round"
                            fill="transparent" 
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-3xl font-extrabold text-slate-800">{lastScan.result.trustScore}%</span>
                          <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Trust Index</span>
                        </div>
                      </div>

                      {/* Job Title & Company */}
                      <div className="text-center mt-4 w-full">
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-1 px-2 mb-1">{lastScan.job.title}</h3>
                        <p className="text-xs text-slate-500 font-medium mb-2">{lastScan.job.company} • {lastScan.job.location}</p>
                        <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${getStatusColor(lastScan.result.status).badge}`}>
                          {lastScan.result.status === 'danger' ? 'Danger Alert' : lastScan.result.status === 'suspicious' ? 'Caution Flag' : 'Verified'}
                        </span>
                      </div>
                    </div>

                    {/* Indicators list */}
                    {lastScan.result.redFlags.length > 0 && (
                      <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4">
                        <h4 className="text-[11px] font-bold text-rose-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Red Flags Found ({lastScan.result.redFlags.length})
                        </h4>
                        <ul className="space-y-2 pl-0 list-none m-0">
                          {lastScan.result.redFlags.map((flag, index) => (
                            <li key={index} className="text-xs text-rose-950 flex items-start gap-2 bg-rose-100/40 p-2 rounded-lg border border-rose-200/50">
                              <span className="text-rose-600 font-bold">•</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lastScan.result.greenFlags.length > 0 && lastScan.result.status !== 'danger' && (
                      <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4">
                        <h4 className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Safety Indicators ({lastScan.result.greenFlags.length})
                        </h4>
                        <ul className="space-y-2 pl-0 list-none m-0">
                          {lastScan.result.greenFlags.slice(0, 3).map((flag, index) => (
                            <li key={index} className="text-xs text-emerald-950 flex items-start gap-2 bg-emerald-100/40 p-2 rounded-lg border border-emerald-200/50">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[350px] bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center p-6 text-center shadow-sm">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-2xl mb-4">
                      <Search className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">No Scanned Job Openings</h3>
                    <p className="text-xs text-slate-400 max-w-[280px] leading-relaxed">
                      Visit job postings on <span className="font-semibold text-slate-600">LinkedIn</span>, <span className="font-semibold text-slate-600">Indeed</span>, or <span className="font-semibold text-slate-600">Glassdoor</span>. VeriWork will automatically scan the content in real-time.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCAN HISTORY */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {selectedHistoryItem ? (
                  /* History Detail Modal/View */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setSelectedHistoryItem(null)}
                        className="text-xs text-indigo-600 font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        ← Back to Logs
                      </button>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{selectedHistoryItem.job.title}</h3>
                          <p className="text-xs text-slate-500">{selectedHistoryItem.job.company}</p>
                        </div>
                        <span className={`text-base font-extrabold px-2 py-0.5 rounded-lg ${getStatusColor(selectedHistoryItem.result.status).bg} ${getStatusColor(selectedHistoryItem.result.status).text}`}>
                          {selectedHistoryItem.result.trustScore}%
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 space-y-1">
                        <p className="m-0">Scanned on: {new Date(selectedHistoryItem.result.scannedAt).toLocaleString()}</p>
                        <p className="m-0 break-all">Source: <a href={selectedHistoryItem.job.url} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">Job Link <ExternalLink className="w-2.5 h-2.5" /></a></p>
                      </div>
                    </div>

                    {selectedHistoryItem.result.redFlags.length > 0 && (
                      <div className="bg-rose-50/50 border border-rose-200/60 rounded-2xl p-4">
                        <h4 className="text-[10px] font-bold text-rose-800 uppercase mb-2">Red Flags</h4>
                        <ul className="space-y-1.5 pl-0 list-none m-0 text-xs">
                          {selectedHistoryItem.result.redFlags.map((flag, idx) => (
                            <li key={idx} className="bg-rose-100/40 p-2 rounded-lg">{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedHistoryItem.result.greenFlags.length > 0 && (
                      <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4">
                        <h4 className="text-[10px] font-bold text-emerald-800 uppercase mb-2">Green Flags</h4>
                        <ul className="space-y-1.5 pl-0 list-none m-0 text-xs">
                          {selectedHistoryItem.result.greenFlags.map((flag, idx) => (
                            <li key={idx} className="bg-emerald-100/40 p-2 rounded-lg">{flag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  /* History List */
                  <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Scanned Logs ({history.length})</span>
                      {history.length > 0 && (
                        <button 
                          onClick={handleClearHistory}
                          className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Clear All
                        </button>
                      )}
                    </div>

                    {history.length > 0 ? (
                      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                        {history.map((item, index) => {
                          const theme = getStatusColor(item.result.status);
                          return (
                            <div 
                              key={index} 
                              onClick={() => setSelectedHistoryItem(item)}
                              className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm hover:border-indigo-100 transition-all cursor-pointer flex items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.lightBg} ${theme.text}`}>
                                  {item.result.status === 'danger' ? (
                                    <ShieldAlert className="w-4 h-4" />
                                  ) : item.result.status === 'suspicious' ? (
                                    <AlertTriangle className="w-4 h-4" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1 m-0">{item.job.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-medium m-0">{item.job.company}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${theme.bg} ${theme.text}`}>
                                  {item.result.trustScore}%
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-center">
                        <History className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-xs">No scan history recorded yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SETTINGS */}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    Configuration Options
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Toggle 1: Enable Extension */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 m-0">Real-time Scanning</h4>
                        <p className="text-[10px] text-slate-400 m-0">Scan job boards automatically as you browse</p>
                      </div>
                      <button 
                        onClick={() => handleToggleSetting('enabled')}
                        className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer relative ${settings.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-sm ${settings.enabled ? 'translate-x-4.5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle 2: Auto Alert */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 m-0">Red Flag Popups</h4>
                        <p className="text-[10px] text-slate-400 m-0">Inject warning scorecards on suspicious jobs</p>
                      </div>
                      <button 
                        onClick={() => handleToggleSetting('autoAlert')}
                        className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer relative ${settings.autoAlert ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-sm ${settings.autoAlert ? 'translate-x-4.5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle 3: Strict Mode */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 m-0">Strict Scan Analysis</h4>
                        <p className="text-[10px] text-slate-400 m-0">Deduct score for minor anomalies</p>
                      </div>
                      <button 
                        onClick={() => handleToggleSetting('strictMode')}
                        className={`w-10 h-5.5 rounded-full p-0.5 transition-colors cursor-pointer relative ${settings.strictMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-sm ${settings.strictMode ? 'translate-x-4.5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950">
                  <h4 className="font-bold mb-1 flex items-center gap-1.5 text-indigo-900">
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Secure Sandbox Environment
                  </h4>
                  <p className="leading-relaxed text-[11px] text-indigo-800 m-0">
                    VeriWork parses job descriptions client-side. No resume data or personal identifiable information (PII) is ever sent to external cloud servers.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Navigation Footer */}
      <footer className="bg-white border-t border-slate-100 flex items-center justify-around py-2.5">
        <button 
          onClick={() => { setActiveTab('scan'); setSelectedHistoryItem(null); }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'scan' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}
        >
          <Shield className="w-4.5 h-4.5" />
          <span className="text-[9px] font-bold tracking-wide uppercase">Scan</span>
        </button>
        <button 
          onClick={() => { setActiveTab('history'); setSelectedHistoryItem(null); }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}
        >
          <History className="w-4.5 h-4.5" />
          <span className="text-[9px] font-bold tracking-wide uppercase">History</span>
        </button>
        <button 
          onClick={() => { setActiveTab('settings'); setSelectedHistoryItem(null); }}
          className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-500'}`}
        >
          <Settings className="w-4.5 h-4.5" />
          <span className="text-[9px] font-bold tracking-wide uppercase">Settings</span>
        </button>
      </footer>
    </div>
  );
}
