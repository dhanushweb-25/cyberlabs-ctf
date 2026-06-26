import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Trophy, ArrowUpDown, Calendar, Award, CheckSquare, Search } from 'lucide-react';

interface ScoreboardEntry {
  rank: number;
  username: string;
  points: number;
  challenges_completed: number;
  last_activity: string;
}

export const Scoreboard: React.FC = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ScoreboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  
  // Sorting states
  const [sortField, setSortField] = useState<string>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset page to 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch scoreboard on params change
  useEffect(() => {
    fetchScoreboard();
  }, [page, debouncedSearchQuery, sortField, sortOrder]);

  const fetchScoreboard = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort_by: sortField,
        sort_order: sortOrder
      });
      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }

      const res = await fetch(`/api/scoreboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Error loading scoreboard", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending
    }
    setPage(1); // Reset to page 1 on sort change
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="bg-ctfBg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-2.5">
              <Trophy className="h-8 w-8 text-warning" />
              Global Leaderboard
            </h1>
            <p className="text-sm text-slate-500 max-w-md">
              Real-time standings of all operators competing in the labs. Solves are weighted dynamically.
            </p>
          </div>

          {/* Search bar inside scoreboard */}
          <div className="w-full md:w-72 relative rounded-lg shadow-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-slate-350 bg-white px-3 py-2.5 pl-9 text-xs text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search user..."
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Podium mock feature for top 3 visual polish (only on page 1 and when not filtering) */}
        {!isLoading && entries.length >= 3 && page === 1 && debouncedSearchQuery === '' && (
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto items-end pt-6 pb-2">
            
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-700">2</div>
              <Link 
                to={`/profile/${entries[1].username}`}
                className="text-xs font-bold text-slate-850 mt-2 truncate max-w-full hover:text-primary hover:underline transition-colors"
              >
                {entries[1].username}
              </Link>
              <span className="text-[10px] text-slate-500 font-bold">{entries[1].points} pts</span>
              <div className="w-full bg-slate-200 rounded-t-lg h-20 mt-3 flex items-center justify-center text-slate-400 font-bold text-xs shadow-inner">2nd</div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center">
              <Trophy className="h-6 w-6 text-warning animate-bounce mb-1" />
              <div className="h-12 w-12 rounded-full bg-amber-100 border-2 border-warning flex items-center justify-center text-sm font-bold text-warning">1</div>
              <Link 
                to={`/profile/${entries[0].username}`}
                className="text-sm font-bold text-slate-850 mt-2 truncate max-w-full hover:text-primary hover:underline transition-colors"
              >
                {entries[0].username}
              </Link>
              <span className="text-xs text-secondary font-bold">{entries[0].points} pts</span>
              <div className="w-full bg-slate-300 rounded-t-lg h-28 mt-3 flex items-center justify-center text-slate-600 font-bold text-sm shadow-md">1st</div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-orange-100 border-2 border-orange-200 flex items-center justify-center text-xs font-bold text-orange-700">3</div>
              <Link 
                to={`/profile/${entries[2].username}`}
                className="text-xs font-bold text-slate-850 mt-2 truncate max-w-full hover:text-primary hover:underline transition-colors"
              >
                {entries[2].username}
              </Link>
              <span className="text-[10px] text-slate-500 font-bold">{entries[2].points} pts</span>
              <div className="w-full bg-slate-100 rounded-t-lg h-14 mt-3 flex items-center justify-center text-slate-400 font-bold text-xs shadow-inner">3rd</div>
            </div>

          </div>
        )}

        {/* Leaderboard Ranking Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-20 bg-white">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-medium text-sm">
                No users found.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    
                    {/* Rank Column */}
                    <th 
                      scope="col" 
                      onClick={() => handleSort('rank')}
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Rank
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>

                    {/* Username Column */}
                    <th 
                      scope="col"
                      onClick={() => handleSort('username')}
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Username
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>

                    {/* Points Column */}
                    <th 
                      scope="col" 
                      onClick={() => handleSort('points')}
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Points
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>

                    {/* Solves Column */}
                    <th 
                      scope="col" 
                      onClick={() => handleSort('challenges_completed')}
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Solves
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>

                    {/* Last Activity Column */}
                    <th 
                      scope="col"
                      onClick={() => handleSort('last_activity')}
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1">
                        Last Activity
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {entries.map((entry) => {
                    const isCurrentUser = user && entry.username === user.username;
                    return (
                      <tr 
                        key={entry.username} 
                        className={`hover:bg-slate-50 transition-colors ${
                          isCurrentUser ? 'bg-primary/5 font-semibold text-slate-900' : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-md text-xs font-bold ${
                            entry.rank === 1 ? 'bg-amber-100 text-warning' :
                            entry.rank === 2 ? 'bg-slate-200 text-slate-700' :
                            entry.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-transparent text-slate-500'
                          }`}>
                            #{entry.rank}
                          </span>
                        </td>

                        {/* Username */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/profile/${entry.username}`}
                              className="font-bold text-slate-800 hover:text-primary hover:underline transition-colors"
                            >
                              {entry.username}
                            </Link>
                            {isCurrentUser && (
                              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[9px] font-bold tracking-wider">
                                YOU
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Points */}
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-600 font-bold">
                          <span className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-warning" />
                            {entry.points}
                          </span>
                        </td>

                        {/* Solved */}
                        <td className="px-6 py-4 whitespace-nowrap text-slate-550">
                          <span className="flex items-center gap-1 font-semibold">
                            <CheckSquare className="h-4 w-4 text-success" />
                            {entry.challenges_completed}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-350" />
                            {formatDate(entry.last_activity)}
                          </span>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {!isLoading && total > limit && (
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-750 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <button
                  disabled={page * limit >= total}
                  onClick={() => setPage(prev => prev + 1)}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-xs font-semibold rounded-lg text-slate-750 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{' '}
                    <span className="font-semibold">{Math.min(page * limit, total)}</span> of{' '}
                    <span className="font-semibold">{total}</span> operators
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-lg border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(prev => Math.max(1, prev - 1))}
                      className="relative inline-flex items-center px-3 py-2 border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-slate-300 bg-slate-50 text-xs font-semibold text-primary">
                      Page {page} of {Math.ceil(total / limit)}
                    </span>
                    <button
                      disabled={page * limit >= total}
                      onClick={() => setPage(prev => prev + 1)}
                      className="relative inline-flex items-center px-3 py-2 border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      disabled={page * limit >= total}
                      onClick={() => setPage(Math.ceil(total / limit))}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-lg border border-slate-300 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Last
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
