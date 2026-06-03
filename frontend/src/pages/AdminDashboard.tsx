import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  Terminal, 
  History, 
  ShieldAlert, 
  Activity, 
  Trash2, 
  RefreshCw, 
  Search
} from 'lucide-react';

interface AdminStats {
  total_users: number;
  active_users_24h: number;
  active_containers: number;
  completed_challenges: number;
  points_awarded: number;
}

interface ActiveContainer {
  id: number;
  username: string;
  challenge_title: string;
  instance_name: string;
  status: string;
  created_at: string;
  expires_at: string;
}

interface AuditLog {
  id: number;
  user_id?: number;
  username?: string;
  action: string;
  details?: string;
  timestamp: string;
}

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  
  // Data States
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [containers, setContainers] = useState<ActiveContainer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filters & Pagination for Audit Log
  const [auditAction, setAuditAction] = useState('');
  const [auditUser, setAuditUser] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(10);
  const [debouncedAuditUser, setDebouncedAuditUser] = useState('');

  // Debounce username filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAuditUser(auditUser);
      setAuditPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [auditUser]);

  const loadData = async () => {
    if (!token) return;
    try {
      setIsRefreshing(true);
      
      // Load Stats
      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      
      // Load Active Containers
      const containerRes = await fetch('/api/admin/instances', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (containerRes.ok) {
        const containerData = await containerRes.json();
        setContainers(containerData);
      }
      
      // Load Audit Logs
      await fetchLogs();

    } catch (err) {
      console.error("Error loading admin data", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchLogs = async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({
        page: auditPage.toString(),
        limit: auditLimit.toString()
      });
      if (auditAction) params.append('action', auditAction);
      if (debouncedAuditUser) params.append('username', debouncedAuditUser);

      const res = await fetch(`/api/admin/audit?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs);
        setAuditTotal(data.total);
      }
    } catch (err) {
      console.error("Error fetching audit logs", err);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh active containers list every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    fetchLogs();
  }, [auditPage, auditAction, debouncedAuditUser]);

  const handleTerminateContainer = async (instanceId: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to force terminate this container?")) return;
    
    try {
      const res = await fetch(`/api/admin/instances/terminate/${instanceId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Reload data
        loadData();
      } else {
        alert("Failed to terminate container.");
      }
    } catch (err) {
      console.error(err);
      alert("Error terminating container.");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRemainingTime = (expiresAtStr: string) => {
    const expires = new Date(expiresAtStr).getTime();
    const now = new Date().getTime();
    const diff = expires - now;
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="bg-ctfBg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <ShieldAlert className="h-8 w-8 text-primary" />
              Admin Management Console
            </h1>
            <p className="text-sm text-slate-500">
              Orchestrate challenge environments, audit user operations, and observe real-time statistics.
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={isRefreshing}
            className="self-start sm:self-center rounded-xl bg-white border border-slate-205 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Dashboard
          </button>
        </div>

        {/* Overview Stats Cards Grid */}
        {stats && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
            
            {/* Total Users */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Users className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.total_users}</h3>
              </div>
            </div>

            {/* Active (24h) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <Activity className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Users (24h)</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.active_users_24h}</h3>
              </div>
            </div>

            {/* Active Containers */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-warning">
                <Terminal className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Containers</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.active_containers}</h3>
              </div>
            </div>

            {/* Solved challenges */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-success">
                <Users className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completed Labs</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.completed_challenges}</h3>
              </div>
            </div>

            {/* Points awarded */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                <Users className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Points Distributed</p>
                <h3 className="text-xl font-bold text-slate-800 mt-0.5">{stats.points_awarded}</h3>
              </div>
            </div>

          </div>
        )}

        {/* Active Docker Containers Management Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              Active Lab Containers ({containers.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {containers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs italic">
                No active VM containers running on host network.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs text-slate-650">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">User</th>
                    <th scope="col" className="px-6 py-3.5">Challenge Lab</th>
                    <th scope="col" className="px-6 py-3.5">Container Instance Name</th>
                    <th scope="col" className="px-6 py-3.5">Created At</th>
                    <th scope="col" className="px-6 py-3.5">Time Remaining</th>
                    <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {containers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{c.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-secondary font-semibold">{c.challenge_title}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500">{c.instance_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400">{formatDate(c.created_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-warning font-bold">{getRemainingTime(c.expires_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleTerminateContainer(c.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-danger hover:underline"
                          title="Terminate Container"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Stop Lab
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Audit Logging Trial Logs Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Security Audit Trails
            </h2>

            {/* Audit Log filter inputs */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative rounded-lg shadow-sm w-full md:w-44">
                <input
                  type="text"
                  value={auditUser}
                  onChange={(e) => setAuditUser(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-8 text-[11px] text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Filter operator..."
                />
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </div>
              </div>

              <div className="relative rounded-lg shadow-sm w-full md:w-44">
                <select
                  value={auditAction}
                  onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[11px] text-slate-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Actions</option>
                  <option value="REGISTER">REGISTER</option>
                  <option value="LOGIN">LOGIN</option>
                  <option value="START_LAB">START_LAB</option>
                  <option value="STOP_LAB">STOP_LAB</option>
                  <option value="SUBMIT_FLAG">SUBMIT_FLAG</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic">
                No logs recorded matching search criteria.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs text-slate-650">
                <thead className="bg-slate-100 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-6 py-3">Timestamp</th>
                    <th scope="col" className="px-6 py-3">Operator</th>
                    <th scope="col" className="px-6 py-3">Action</th>
                    <th scope="col" className="px-6 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-slate-400 font-mono">{formatDate(log.timestamp)}</td>
                      <td className="px-6 py-3 whitespace-nowrap font-bold text-slate-800">{log.username || 'System'}</td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          log.action.includes('SUBMIT_FLAG') ? 'bg-green-50 text-success' :
                          log.action.includes('START') ? 'bg-blue-50 text-primary' :
                          log.action.includes('STOP') ? 'bg-red-50 text-danger' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-500 font-medium max-w-sm truncate" title={log.details}>
                        {log.details || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Audit Logs pagination */}
          {auditTotal > auditLimit && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Page {auditPage} of {Math.ceil(auditTotal / auditLimit)} ({auditTotal} logs total)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={auditPage === 1}
                  onClick={() => setAuditPage(prev => Math.max(1, prev - 1))}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  disabled={auditPage * auditLimit >= auditTotal}
                  onClick={() => setAuditPage(prev => prev + 1)}
                  className="rounded border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
