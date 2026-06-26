import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Calendar, Award, Trophy, CheckCircle, TrendingUp, Cpu, Flame, ArrowLeft } from 'lucide-react';

interface ActivityItem {
  type: string;
  challenge_title: string;
  timestamp: string;
  points?: number;
  status?: string;
}

interface ProfileData {
  username: string;
  email: string;
  join_date: string;
  points: number;
  rank: number;
  completed_challenges: number;
  total_challenges: number;
  progress_percentage: number;
  recent_activities: ActivityItem[];
  current_streak: number;
  longest_streak: number;
  last_solve_date: string | null;
}

export const UserProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { token } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchUserProfile();
    }
  }, [username, token]);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/profile/${username}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to load user profile");
      }
    } catch (err) {
      console.error("Error loading user profile", err);
      setError("A network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatJoinDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-ctfBg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent font-sans"></div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-ctfBg min-h-screen py-8 px-4 flex flex-col items-center justify-center text-center">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-4">
          <Trophy className="h-12 w-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">Profile Not Found</h2>
          <p className="text-sm text-slate-500">
            {error || `The user "${username}" does not exist or has inactive profile access.`}
          </p>
          <Link 
            to="/scoreboard" 
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scoreboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ctfBg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center">
          <Link 
            to="/scoreboard" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-705 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Scoreboard
          </Link>
        </div>

        {/* Profile Split Layout (Left: Identity card, Right: Learning Stats) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Identity Card (Left) */}
          <div className="md:col-span-1 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center space-y-6">
            
            {/* Custom Avatar */}
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-3xl uppercase border-2 border-primary/20">
                {profile.username.substring(0, 2)}
              </div>
              <div className="absolute bottom-0 right-0 rounded-full bg-green-400 p-1.5 border-2 border-white" title="Online" />
            </div>

            {/* Profile Info fields */}
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-800">{profile.username}</h2>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-secondary uppercase tracking-wider bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5">
                Operator Rank #{profile.rank}
              </span>
            </div>

            {/* Field Details */}
            <div className="w-full border-t border-slate-100 pt-6 text-left space-y-3.5 text-xs text-slate-650">
              
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Email Address</span>
                  <span className="font-semibold text-slate-800 break-all">{profile.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block uppercase">Join Date</span>
                  <span className="font-semibold text-slate-800">{formatJoinDate(profile.join_date)}</span>
                </div>
              </div>

            </div>

          </div>

          {/* Learning stats and progress (Right) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Stats Overview banner */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm grid grid-cols-3 gap-4">
              
              <div className="text-center space-y-1 py-2 border-r border-slate-100">
                <Trophy className="h-5 w-5 text-warning mx-auto" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Rank</span>
                <span className="text-lg font-bold text-slate-800 font-mono">#{profile.rank}</span>
              </div>

              <div className="text-center space-y-1 py-2 border-r border-slate-100">
                <Award className="h-5 w-5 text-secondary mx-auto" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Points</span>
                <span className="text-lg font-bold text-slate-800 font-mono">{profile.points} pts</span>
              </div>

              <div className="text-center space-y-1 py-2">
                <CheckCircle className="h-5 w-5 text-success mx-auto" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Solves</span>
                <span className="text-lg font-bold text-slate-800 font-mono">{profile.completed_challenges} / {profile.total_challenges}</span>
              </div>

            </div>

            {/* Streak Tracker Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Flame className="h-4.5 w-4.5 text-orange-500 animate-pulse" />
                Solve Streak Tracker
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50/50 rounded-xl p-4 border border-orange-100 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-orange-650 uppercase tracking-wider block">Current Streak</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Flame className="h-6 w-6 text-orange-500 fill-orange-500" />
                    <span className="text-2xl font-black text-slate-800 font-mono">{profile.current_streak}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">consecutive days</span>
                </div>

                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-amber-650 uppercase tracking-wider block">Longest Streak</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Trophy className="h-6 w-6 text-amber-500" />
                    <span className="text-2xl font-black text-slate-800 font-mono">{profile.longest_streak}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5">days record</span>
                </div>
              </div>

              {profile.last_solve_date && (
                <div className="text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Last Solve Date: <span className="text-slate-650 font-bold">{new Date(profile.last_solve_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Learning Progress container */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" />
                  Learning Progress
                </h3>
                <span className="text-xs font-extrabold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {profile.progress_percentage}% Completed
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${profile.progress_percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Novice (0%)</span>
                  <span>Master (100%)</span>
                </div>
              </div>
            </div>

            {/* Activity History audit trail */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Activity History</h3>
              
              {profile.recent_activities && profile.recent_activities.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {profile.recent_activities.map((act, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`p-1.5 rounded-lg ${
                          act.type === 'Completed' ? 'bg-green-50 text-success' : 'bg-slate-50 text-slate-500'
                        }`}>
                          {act.type === 'Completed' ? <CheckCircle className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-700">
                            {act.type === 'Completed' 
                              ? `Completed '${act.challenge_title}'` 
                              : `Attempted flag submit for '${act.challenge_title}'`
                            }
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.timestamp).toLocaleDateString()} at {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="font-bold text-right font-mono shrink-0">
                        {act.points ? (
                          <span className="text-success">+{act.points} pts</span>
                        ) : (
                          <span className={act.status === 'Correct' ? 'text-success' : 'text-danger'}>
                            {act.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-400 block italic">No history logged yet. Complete challenges to fill your logs.</span>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
