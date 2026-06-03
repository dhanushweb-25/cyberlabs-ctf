import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, 
  Terminal, 
  Activity, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Hourglass, 
  Play 
} from 'lucide-react';

interface ActivityItem {
  type: string;
  challenge_title: string;
  timestamp: string;
  points?: number;
  status?: string;
}

interface Challenge {
  id: number;
  title: string;
  difficulty: string;
  points: number;
  category: string;
  estimated_time: string;
  is_solved: boolean;
}

export const Dashboard: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [activeLab, setActiveLab] = useState<any>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  useEffect(() => {
    if (!activeLab) return;
    setSecondsRemaining(activeLab.active_seconds_remaining);
  }, [activeLab]);

  useEffect(() => {
    if (!activeLab || secondsRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveLab(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeLab, secondsRemaining]);

  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      
      // Fetch Profile Details
      const profileRes = await fetch('/api/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profile = await profileRes.json();
      setProfileData(profile);

      // Fetch All Challenges
      const challengesRes = await fetch('/api/challenges', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const challs = await challengesRes.json();
      setChallenges(challs);

      // Fetch Active Lab
      const activeRes = await fetch('/api/challenges/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (activeRes.ok) {
        const active = await activeRes.json();
        setActiveLab(active);
      }
      
      // Update global user state points/rank
      refreshProfile();

    } catch (err) {
      console.error("Error loading dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100-16)] items-center justify-center bg-ctfBg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Calculate dynamic stats
  const completedCount = challenges.filter(c => c.is_solved).length;
  
  // Calculate active challenges: challenges with any activity in profileData.recent_activities but not solved
  // Or we can mock active count based on local storage started challenges
  const activeChallengesLocal = JSON.parse(localStorage.getItem('ctf_started_labs') || '[]');
  const activeCount = challenges.filter(c => !c.is_solved && activeChallengesLocal.includes(c.id)).length;

  const points = profileData?.points ?? user?.points ?? 0;
  const rank = profileData?.rank ?? user?.rank ?? 99;

  // Filter recommendations (first 2-3 unsolved challenges)
  const recommendations = challenges.filter(c => !c.is_solved).slice(0, 3);

  // Format activity logs
  const activities: ActivityItem[] = profileData?.recent_activities || [];

  return (
    <div className="bg-ctfBg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Welcome Header */}
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Welcome Back, {user?.username}
            </h1>
            <p className="text-teal-100 max-w-xl text-sm sm:text-base">
              Ready to sharpen your skills? Pick up where you left off or dive into a brand new lab challenge.
            </p>
          </div>
          {/* Decorative elements */}
          <div className="absolute right-0 bottom-0 top-0 opacity-10 flex items-center justify-center pointer-events-none pr-8">
            <Terminal className="h-64 w-64" />
          </div>
        </div>

        {/* Active Lab Notification */}
        {activeLab && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-105 flex items-center justify-center text-amber-700">
                <Terminal className="h-5.5 w-5.5 text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-805">You have an active lab instance running!</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instance: <span className="font-semibold text-slate-700">{activeLab.instance_name}</span> • 
                  Remaining: <span className="font-mono font-bold text-amber-700 ml-1">{(() => {
                    const h = Math.floor(secondsRemaining / 3600);
                    const m = Math.floor((secondsRemaining % 3600) / 60);
                    const s = secondsRemaining % 60;
                    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                  })()}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/challenges/terminate', {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                      setActiveLab(null);
                      setSecondsRemaining(0);
                      fetchDashboardData();
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="text-xs font-semibold text-danger hover:underline px-3 py-2"
              >
                Terminate Lab
              </button>
              <Link
                to={`/workspace/${activeLab.instance_name}`}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow hover:bg-primary-light transition-all flex items-center gap-1"
              >
                Resume Lab
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Dynamic Statistics Cards Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Completed */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Challenges Solved</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{completedCount} / {challenges.length}</h3>
            </div>
          </div>

          {/* Card 2: Points */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-warning">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Points Earned</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{points} pts</h3>
            </div>
          </div>

          {/* Card 3: Rank */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-secondary">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Rank</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">#{rank}</h3>
            </div>
          </div>

          {/* Card 4: Active Labs */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center gap-4 hover-card">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Hourglass className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Challenges</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeCount}</h3>
            </div>
          </div>

        </div>

        {/* Dashboard split grid (Left: Recommendations, Right: Activities) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Continue Learning / Recommended Challenges (Col span 2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Continue Learning</h2>
              <Link to="/challenges" className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-0.5">
                Browse All Catalog
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {recommendations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recommendations.map((chall) => (
                  <div key={chall.id} className="bg-white rounded-2xl p-6 border border-slate-150 shadow-sm hover-card flex flex-col justify-between h-48">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                          {chall.category}
                        </span>
                        <span className={`text-xs font-bold ${
                          chall.difficulty === 'Easy' ? 'text-success' :
                          chall.difficulty === 'Medium' ? 'text-warning' : 'text-danger'
                        }`}>
                          {chall.difficulty}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 line-clamp-1">{chall.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{chall.estimated_time} estimated • {chall.points} pts</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Not started</span>
                      <Link 
                        to={`/challenges/${chall.id}`}
                        className="rounded-lg bg-primary/10 hover:bg-primary/20 px-3 py-1.5 text-xs font-bold text-primary flex items-center gap-1 transition-colors"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Start Lab
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                🎉 Excellent! You have solved all the available challenges. Feel free to re-explore them!
              </div>
            )}
          </div>

          {/* Recent Activity (Col span 1) */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
            
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm min-h-[300px]">
              {activities.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {activities.map((act, actIdx) => (
                      <li key={actIdx}>
                        <div className="relative pb-8">
                          {actIdx !== activities.length - 1 ? (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true" />
                          ) : null}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                                act.type === 'Completed' ? 'bg-green-50 text-success' :
                                act.status === 'Correct' ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'
                              }`}>
                                <Activity className="h-4 w-4" />
                              </span>
                            </div>
                            <div className="flex-grow pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-xs text-slate-600">
                                  {act.type === 'Completed' ? (
                                    <>Completed <span className="font-semibold text-slate-850">{act.challenge_title}</span></>
                                  ) : (
                                    <>Submitted flag for <span className="font-semibold text-slate-850">{act.challenge_title}</span></>
                                  )}
                                </p>
                                <span className="text-[10px] text-slate-400 mt-0.5 block">
                                  {new Date(act.timestamp).toLocaleDateString()} {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="text-right text-xs font-semibold whitespace-nowrap text-slate-500">
                                {act.points ? <span className="text-success font-bold">+{act.points} pts</span> : <span className="text-danger font-medium">{act.status}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[250px] text-slate-400 text-center space-y-2">
                  <Activity className="h-8 w-8 stroke-1 text-slate-300" />
                  <p className="text-xs">No activity logged yet.</p>
                  <p className="text-[10px] max-w-[180px]">Start resolving challenges from the catalog to build logs.</p>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
