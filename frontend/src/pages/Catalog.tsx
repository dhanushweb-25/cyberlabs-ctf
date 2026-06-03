import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Search, SlidersHorizontal, BookOpen, Terminal, ShieldAlert, Network, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  category: string;
  estimated_time: string;
  is_solved: boolean;
}

export const Catalog: React.FC = () => {
  const { token } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  const categories = ['All', 'Linux', 'Networking', 'Web Security', 'SOC'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard'];

  useEffect(() => {
    fetchChallenges();
  }, [token]);

  const fetchChallenges = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/challenges', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setChallenges(data);
      }
    } catch (err) {
      console.error("Error fetching challenges", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter application
  const filteredChallenges = challenges.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || c.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || c.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Linux': return <Terminal className="h-4 w-4" />;
      case 'Networking': return <Network className="h-4 w-4" />;
      case 'Web Security': return <ShieldAlert className="h-4 w-4" />;
      case 'SOC': return <ShieldCheck className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100-16)] items-center justify-center bg-ctfBg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-ctfBg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header & Subtitle */}
        <div className="text-center md:text-left space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Challenge Catalog</h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Acquire practical hacking experience. Filter, search, and click Start Challenge to launch a containerized training environment.
          </p>
        </div>

        {/* Filters Panel Container */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            
            {/* Search Bar */}
            <div className="md:col-span-6 relative rounded-lg shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-lg border border-slate-350 pl-10 pr-3 py-2.5 text-sm text-slate-900 placeholder-slate-450 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                placeholder="Search by challenge name or concept..."
              />
            </div>

            {/* Difficulty Dropdown */}
            <div className="md:col-span-3 flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Difficulty</span>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="block w-full rounded-lg border border-slate-350 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {difficulties.map(diff => (
                  <option key={diff} value={diff}>{diff}</option>
                ))}
              </select>
            </div>

            {/* Category Filter Desktop Buttons */}
            <div className="md:col-span-3 flex items-center justify-end">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {filteredChallenges.length} challenges found
              </span>
            </div>

          </div>

          {/* Category Tabs Row */}
          <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-white shadow-sm shadow-primary/10'
                    : 'bg-slate-50 text-slate-650 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {getCategoryIcon(cat)}
                {cat}
              </button>
            ))}
          </div>

        </div>

        {/* Challenges Grid */}
        {filteredChallenges.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredChallenges.map((chall) => (
              <div 
                key={chall.id} 
                className={`bg-white rounded-2xl border transition-all flex flex-col justify-between hover-card custom-shadow h-[220px] ${
                  chall.is_solved ? 'border-green-200' : 'border-slate-200'
                }`}
              >
                {/* Solved Status bar */}
                {chall.is_solved && (
                  <div className="rounded-t-2xl bg-green-50 px-4 py-1.5 border-b border-green-150 flex items-center gap-1 text-[11px] font-bold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    SOLVED
                  </div>
                )}
                
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div>
                    {/* Header line */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                        {getCategoryIcon(chall.category)}
                        {chall.category}
                      </span>
                      
                      <span className={`text-xs font-bold ${
                        chall.difficulty === 'Easy' ? 'text-success' :
                        chall.difficulty === 'Medium' ? 'text-warning' : 'text-danger'
                      }`}>
                        {chall.difficulty}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 line-clamp-1">{chall.title}</h3>
                    <p className="text-xs text-slate-400 mt-1.5">{chall.estimated_time} duration • {chall.points} points</p>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-4">
                    <span className="text-xs font-bold text-secondary">{chall.points} pts</span>
                    
                    <Link 
                      to={`/challenges/${chall.id}`}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
                        chall.is_solved
                          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          : 'bg-primary text-white hover:bg-primary-light shadow-sm shadow-primary/10 hover:scale-[1.01]'
                      }`}
                    >
                      {chall.is_solved ? "Review Lab" : "Start Challenge"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-250 p-12 text-center max-w-md mx-auto space-y-3">
            <BookOpen className="h-12 w-12 text-slate-350 stroke-1 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Challenges Found</h3>
            <p className="text-xs text-slate-500">
              No labs match your active search terms or categories. Try clearing filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedDifficulty('All');
              }}
              className="text-xs font-bold text-primary hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
