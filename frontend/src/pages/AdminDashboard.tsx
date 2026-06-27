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
  Search,
  Plus,
  Edit,
  X,
  LayoutDashboard,
  List,
  Sparkles,
  Wand2
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

  // Challenge Management Tab States
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'ai_generator'>('overview');
  const [challenges, setChallenges] = useState<any[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ success: boolean; message: string; challengeId?: number } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // Challenge Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [points, setPoints] = useState(50);
  const [category, setCategory] = useState('Linux');
  const [estimatedTime, setEstimatedTime] = useState('30m');
  const [providerType, setProviderType] = useState('docker');
  const [flagValue, setFlagValue] = useState('');
  const [hint, setHint] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadChallenges = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/challenges', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges(data);
      }
    } catch (err) {
      console.error("Error loading challenges", err);
    }
  };

  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError(null);

    const payload = {
      title,
      description,
      difficulty,
      points: Number(points),
      category,
      estimated_time: estimatedTime,
      provider_type: providerType,
      flag_value: flagValue,
      hint: hint || null
    };

    try {
      const url = isEditing ? `/api/admin/challenges/${editId}` : '/api/admin/challenges';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowFormModal(false);
        resetForm();
        loadChallenges();
        loadData(); // refresh stats
      } else {
        const data = await res.json();
        setFormError(data.detail || "Failed to save challenge");
      }
    } catch (err) {
      console.error("Error saving challenge", err);
      setFormError("A network error occurred.");
    }
  };

  const handleEditClick = (c: any) => {
    setIsEditing(true);
    setEditId(c.id);
    setTitle(c.title);
    setDescription(c.description);
    setDifficulty(c.difficulty);
    setPoints(c.points);
    setCategory(c.category);
    setEstimatedTime(c.estimated_time);
    setProviderType(c.provider_type);
    setFlagValue(""); // flags are private in DB, user can type a new one
    setHint(c.hint || "");
    setFormError(null);
    setShowFormModal(true);
  };

  const handleDeleteChallenge = async (id: number) => {
    if (!token) return;
    if (!window.confirm("Are you sure you want to delete this challenge? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/admin/challenges/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        loadChallenges();
        loadData(); // refresh stats
      }
    } catch (err) {
      console.error("Error deleting challenge", err);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setTitle('');
    setDescription('');
    setDifficulty('Easy');
    setPoints(50);
    setCategory('Linux');
    setEstimatedTime('30m');
    setProviderType('docker');
    setFlagValue('');
    setHint('');
    setFormError(null);
  };

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim() || !token) return;

    try {
      setIsGeneratingAI(true);
      setAiFeedback(null);

      const res = await fetch('/api/admin/challenges/generate-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        setAiFeedback({
          success: true,
          message: `Successfully created challenge: "${data.title}"!`,
          challengeId: data.challenge_id
        });
        setAiPrompt('');
        loadChallenges();
        loadData();
      } else {
        const errData = await res.json();
        setAiFeedback({
          success: false,
          message: errData.detail || 'Failed to generate challenge.'
        });
      }
    } catch (err: any) {
      console.error(err);
      setAiFeedback({
        success: false,
        message: 'A network error occurred while generating.'
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Fetch challenges if tab changes to challenges or ai_generator
  useEffect(() => {
    if (activeTab === 'challenges' || activeTab === 'ai_generator') {
      loadChallenges();
    }
  }, [activeTab]);

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
            onClick={activeTab === 'overview' ? loadData : loadChallenges}
            disabled={isRefreshing}
            className="self-start sm:self-center rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-slate-200 pb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-white shadow-sm shadow-primary/10'
                : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'challenges'
                ? 'bg-primary text-white shadow-sm shadow-primary/10'
                : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <List className="h-4 w-4" />
            Manage Challenges
          </button>
          <button
            onClick={() => setActiveTab('ai_generator')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'ai_generator'
                ? 'bg-primary text-white shadow-sm shadow-primary/10'
                : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            AI Lab Builder
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
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
          </>
        )}

        {activeTab === 'challenges' && (
          /* Manage Challenges Tab content */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-primary" />
                  CTF Challenges ({challenges.length})
                </h2>
                <button
                  onClick={() => {
                    resetForm();
                    setShowFormModal(true);
                  }}
                  className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primaryDark shadow-sm shadow-primary/10 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add Challenge
                </button>
              </div>

              <div className="overflow-x-auto">
                {challenges.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    No challenges found. Create one to get started.
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200 text-left text-xs text-slate-650">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-6 py-3.5">Title</th>
                        <th scope="col" className="px-6 py-3.5">Category</th>
                        <th scope="col" className="px-6 py-3.5">Difficulty</th>
                        <th scope="col" className="px-6 py-3.5">Points</th>
                        <th scope="col" className="px-6 py-3.5">Provider Type</th>
                        <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium">
                      {challenges.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{c.title}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-secondary font-semibold">{c.category}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                              c.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600' :
                              c.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600' :
                              'bg-rose-50 text-rose-600'
                            }`}>
                              {c.difficulty}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-slate-800">{c.points}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-500">{c.provider_type}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                            <button
                              onClick={() => handleEditClick(c)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteChallenge(c.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-danger hover:underline"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ai_generator' && (
          /* AI Generator Tab Content */
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Gemini AI Lab Builder</h2>
                  <p className="text-xs text-slate-500 font-medium">Describe the hands-on lab environment, files, and objectives, and Gemini will automatically construct and compile the Docker container challenge.</p>
                </div>
              </div>

              <div className="border-t border-slate-150 pt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prompt Idea & Exploit Logic</label>
                   <textarea
                     value={aiPrompt}
                     onChange={(e) => setAiPrompt(e.target.value)}
                     disabled={isGeneratingAI}
                     className="block w-full rounded-xl border border-slate-350 px-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors min-h-[140px]"
                     placeholder="Example: Create a SQL injection challenge where players must bypass authentication on a local python server running on port 8080 to fetch the flag 'flag{sqli_admin_bypass}'."
                   />
                </div>

                {aiFeedback && (
                  <div className={`rounded-xl p-4 text-xs font-semibold border flex items-start gap-2.5 ${
                    aiFeedback.success
                      ? 'bg-green-50 text-success border-green-150'
                      : 'bg-red-50 text-danger border-red-150'
                  }`}>
                    <div className="mt-0.5">
                      {aiFeedback.success ? '✓' : '✗'}
                    </div>
                    <div className="space-y-1">
                      <p>{aiFeedback.message}</p>
                      {aiFeedback.challengeId && (
                        <p className="text-[10px] text-slate-400 font-medium">Challenge ID: {aiFeedback.challengeId} is being compiled in the background.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={handleGenerateAI}
                    disabled={isGeneratingAI || !aiPrompt.trim()}
                    className="rounded-xl bg-indigo-650 px-6 py-3 font-semibold text-white shadow-lg hover:bg-indigo-700 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGeneratingAI ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>AI is coding container scripts...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4" />
                        <span>Generate Lab with Gemini</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showFormModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setShowFormModal(false)}
            ></div>
            
            {/* Modal Body */}
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all w-full max-w-2xl border border-slate-100 flex flex-col max-h-[90vh] z-10">
              {/* Modal Header */}
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  {isEditing ? 'Edit Challenge' : 'Create New Challenge'}
                </h3>
                <button 
                  onClick={() => setShowFormModal(false)} 
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form Scrollable Content */}
              <form onSubmit={handleSaveChallenge} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {formError && (
                  <div className="rounded-xl bg-red-50 p-4 text-xs font-semibold text-danger border border-red-100">
                    {formError}
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Challenge Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Command Injection Basics"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description (Markdown Supported)</label>
                  <textarea
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide a detailed explanation, tasks, and guidance..."
                    rows={4}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all font-sans"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="Linux">Linux</option>
                      <option value="Cryptography">Cryptography</option>
                      <option value="Web">Web</option>
                      <option value="Reverse Engineering">Reverse Engineering</option>
                      <option value="Forensics">Forensics</option>
                      <option value="Binary Exploitation">Binary Exploitation</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Points */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points</label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={1000}
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>

                  {/* Estimated Time */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Est. Time (e.g. 30m, 2h)</label>
                    <input
                      type="text"
                      required
                      value={estimatedTime}
                      onChange={(e) => setEstimatedTime(e.target.value)}
                      placeholder="30m"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    />
                  </div>

                  {/* Provider Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Provider Type</label>
                    <select
                      value={providerType}
                      onChange={(e) => setProviderType(e.target.value)}
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value="docker">Docker Instance</option>
                      <option value="gcp">Google Cloud Platform</option>
                    </select>
                  </div>
                </div>

                {/* Flag Value */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Flag Value</span>
                    {isEditing && <span className="text-[9px] text-slate-400 normal-case font-normal">(leave blank to keep unchanged)</span>}
                  </label>
                  <input
                    type="text"
                    required={!isEditing}
                    value={flagValue}
                    onChange={(e) => setFlagValue(e.target.value)}
                    placeholder="flag{some_secret_string}"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-mono text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Hint */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hint (Optional)</label>
                  <input
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="e.g., Check the directory listing using ls -la"
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="border-t border-slate-100 pt-4 flex justify-end gap-3 bg-white sticky bottom-0">
                  <button
                    type="button"
                    onClick={() => setShowFormModal(false)}
                    className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryDark shadow-sm shadow-primary/10 transition-all"
                  >
                    {isEditing ? 'Save Changes' : 'Create Challenge'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
