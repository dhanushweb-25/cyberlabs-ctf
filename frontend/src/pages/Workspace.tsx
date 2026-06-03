import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Terminal, 
  Clock, 
  Award, 
  ExternalLink, 
  AlertCircle, 
  Sparkles,
  HelpCircle,
  LogOut,
  CheckCircle
} from 'lucide-react';

interface Challenge {
  id: number;
  title: string;
  difficulty: string;
  points: number;
  category: string;
  estimated_time: string;
  description: string;
  provider_type: string;
  is_solved: boolean;
  hint?: string;
}

interface LabEnvironment {
  id: number;
  user_id: number;
  challenge_id: number;
  instance_name: string;
  status: string;
  port?: number;
  created_at: string;
  expires_at: string;
  active_seconds_remaining: number;
}

export const Workspace: React.FC = () => {
  const { instanceName } = useParams<{ instanceName: string }>();
  const { token, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [lab, setLab] = useState<LabEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [flag, setFlag] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Fetch active lab session
  useEffect(() => {
    const fetchActiveLabAndChallenge = async () => {
      if (!token) return;
      try {
        setIsLoading(true);
        const res = await fetch('/api/challenges/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Verify active lab matches route or if route isn't set, recover
          if (data && (!instanceName || data.instance_name === instanceName)) {
            setLab(data);
            setSecondsRemaining(data.active_seconds_remaining);
            
            // Fetch challenge details
            const challRes = await fetch(`/api/challenges/${data.challenge_id}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (challRes.ok) {
              const challData = await challRes.json();
              setChallenge(challData);
            }
          } else {
            // No active lab or mismatch
            navigate('/challenges');
          }
        } else {
          navigate('/challenges');
        }
      } catch (err) {
        console.error("Error loading workspace data", err);
        navigate('/challenges');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveLabAndChallenge();
  }, [instanceName, token, navigate]);

  // Live Timer Countdown
  useEffect(() => {
    if (!lab) return;
    
    if (secondsRemaining <= 0) {
      handleStopLab();
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleStopLab();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lab, secondsRemaining]);

  const handleStopLab = async () => {
    setIsLeaving(true);
    setSecondsRemaining(0);
    const targetUrl = challenge ? `/challenges/${challenge.id}` : '/challenges';
    
    if (!token) {
      navigate(targetUrl);
      return;
    }
    try {
      await fetch('/api/challenges/terminate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Error terminating lab", err);
    }
    navigate(targetUrl);
  };

  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || !token || !challenge) return;

    try {
      setIsSubmittingFlag(true);
      setSubmissionFeedback(null);

      const res = await fetch('/api/challenges/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          challenge_id: challenge.id,
          submitted_flag: flag.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSubmissionFeedback({
          correct: data.correct,
          message: data.message
        });

        if (data.correct) {
          setChallenge(prev => prev ? { ...prev, is_solved: true } : null);
          refreshProfile();
          // Remove from active list
          const activeList = JSON.parse(localStorage.getItem('ctf_started_labs') || '[]');
          const filtered = activeList.filter((id: number) => id !== challenge.id);
          localStorage.setItem('ctf_started_labs', JSON.stringify(filtered));
        }
      }
    } catch (err) {
      console.error("Error submitting flag", err);
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  const getObjectives = (id: number) => {
    const isSolved = submissionFeedback?.correct || false;
    switch (id) {
      case 1:
        return [
          { text: "Launch the virtual Linux lab environment.", completed: isSolved || !!lab },
          { text: "Search the filesystem directories using 'cd' and 'ls'.", completed: isSolved },
          { text: "Discover the hidden flag file (often starting with a dot, or in nested dirs).", completed: isSolved },
          { text: "Read the secret flag using 'cat' and submit it.", completed: isSolved }
        ];
      case 2:
        return [
          { text: "Launch the virtual Linux lab.", completed: isSolved || !!lab },
          { text: "Check permissions of the 'flag.txt' file in '/home/ctfuser'.", completed: isSolved },
          { text: "Find a way to read it using local groups privileges or sudo permissions.", completed: isSolved },
          { text: "Submit the flag.", completed: isSolved }
        ];
      default:
        return [
          { text: "Spawn the isolated target node.", completed: isSolved || !!lab },
          { text: "Examine services, configurations, and scripts to exploit vulnerability.", completed: isSolved },
          { text: "Locate and extract the hidden challenge flag.", completed: isSolved }
        ];
    }
  };

  const getHelpfulLinks = (id: number) => {
    switch (id) {
      case 1:
        return [
          { name: "Linux commands reference sheet", url: "https://tldr.sh" },
          { name: "Introduction to filesystem navigation", url: "https://linuxjourney.com" }
        ];
      default:
        return [
          { name: "Basic Linux Journey Modules", url: "https://linuxjourney.com" },
          { name: "Security Reference Cheat Sheet", url: "https://gtfobins.github.io" }
        ];
    }
  };

  if (isLoading || isLeaving) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-sm font-semibold text-slate-400">
            {isLeaving ? "Terminating environment and returning to briefing..." : "Loading lab environment workspace..."}
          </p>
        </div>
      </div>
    );
  }

  if (!challenge || !lab) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold">No Active Lab Session Found</h2>
          <p className="text-slate-400 text-sm">Please launch a lab container from the challenge details page.</p>
          <Link to="/challenges" className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold hover:bg-emerald-500 transition-all">
            Return to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen flex flex-col text-slate-100">
      
      {/* Premium Dashboard Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/challenges/${challenge.id}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Lab Briefing
          </button>
          
          <div className="h-4 w-px bg-slate-850" />
          
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
              {challenge.category}
            </span>
            <h1 className="text-base font-extrabold text-white tracking-tight">{challenge.title}</h1>
          </div>
        </div>

        {/* Live Controls Bar */}
        <div className="flex items-center gap-6">
          {/* Active status */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-350 bg-slate-800/40 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Target: {lab.instance_name}</span>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>
              {(() => {
                const h = Math.floor(secondsRemaining / 3600);
                const m = Math.floor((secondsRemaining % 3600) / 60);
                const s = secondsRemaining % 60;
                return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
              })()}
            </span>
          </div>

          {/* Terminate Button */}
          <button
            onClick={handleStopLab}
            className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white px-3 py-1.5 text-xs font-bold text-rose-400 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Leave Lab</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Split Grid */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* Left Side: Objectives & Flag Form (Col span 4) */}
        <div className="lg:col-span-4 border-r border-slate-850 bg-slate-900/30 p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-73px)]">
          
          {/* Objectives Card */}
          <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-emerald-400" /> Objectives Checklist
            </h3>
            
            <ul className="space-y-3">
              {getObjectives(challenge.id).map((obj, index) => (
                <li key={index} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={obj.completed}
                    disabled
                    className="h-4 w-4 mt-0.5 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-transparent focus:ring-offset-0 disabled:opacity-80"
                  />
                  <span className={obj.completed ? "line-through text-slate-500" : ""}>{obj.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Target Machine details for GCP challenges */}
          {challenge.provider_type === 'gcp' && (
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="h-4.5 w-4.5 text-emerald-400" /> Target Machine Info
              </h3>
              <div className="space-y-1 bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Hostname:</span>
                  <span className="text-emerald-400 font-bold select-all">
                    ctf-gcp-victim-{lab.user_id}-{lab.challenge_id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IP (VPC):</span>
                  <span className="text-slate-350 select-all font-bold">
                    ctf-gcp-victim-{lab.user_id}-{lab.challenge_id}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                This is the victim machine. From your terminal, run <code className="text-emerald-400 font-mono font-bold bg-slate-950 px-1 py-0.5 rounded border border-slate-850">nmap --unprivileged -sT -Pn ctf-gcp-victim-{lab.user_id}-{lab.challenge_id}</code> to scan for open ports and start exploiting!
              </p>
            </div>
          )}

          {/* Lab Briefing Text */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mission Target</h3>
            <p className="text-xs text-slate-450 leading-relaxed whitespace-pre-line bg-slate-900/20 p-4 rounded-xl border border-slate-850">
              {challenge.description}
            </p>
          </div>

          {/* Resources & Support */}
          <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-emerald-400" /> Helpful Resources
            </h3>
            <div className="space-y-2 text-xs">
              {getHelpfulLinks(challenge.id).map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-slate-300 hover:text-emerald-400 font-semibold transition-colors"
                >
                  <span>{link.name}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Helpful Hint Card */}
          {challenge.hint && (
            <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="h-4 w-4 text-amber-400" /> Stalled? Use a Hint
                </h3>
                <button
                  onClick={() => setShowHint(prev => !prev)}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-350 transition-colors uppercase tracking-wider"
                >
                  {showHint ? "Hide Hint" : "Reveal Hint"}
                </button>
              </div>
              
              {showHint && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-300 leading-normal animate-fadeIn font-semibold">
                  {challenge.hint}
                </div>
              )}
            </div>
          )}

          {/* Submit Flag Panel */}
          <div className="bg-slate-900/60 rounded-xl p-5 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submit Flag</h3>
            
            <form onSubmit={handleSubmitFlag} className="space-y-4">
              {submissionFeedback && (
                <div className={`rounded-lg p-3 text-xs flex gap-2 border ${
                  submissionFeedback.correct
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  {submissionFeedback.correct ? (
                    <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <span>{submissionFeedback.message}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <input
                  type="text"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                  disabled={isSubmittingFlag}
                  className="block w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                  placeholder="CTF{flag_format_example}"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingFlag || !flag.trim()}
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white shadow hover:bg-emerald-550 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingFlag ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Award className="h-4 w-4" />
                    <span>Submit Flag</span>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Web Terminal Iframe (Col span 8) */}
        <div className="lg:col-span-8 bg-slate-950 flex flex-col p-4">
          <div className="flex-grow rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-950 flex flex-col">
            
            {/* Terminal Title Bar */}
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">Interactive Terminal Shell ({challenge.provider_type})</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-[10px]">Secure Gateway</span>
              </div>
            </div>

            {/* Iframe */}
            <iframe
              src={`/api/challenges/terminal/${lab.instance_name}/?token=${token}`}
              className="w-full flex-grow border-0 bg-slate-950"
              title="Web Terminal"
              allow="clipboard-read; clipboard-write"
            />
            
          </div>
        </div>

      </main>

    </div>
  );
};
