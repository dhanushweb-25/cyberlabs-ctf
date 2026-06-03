import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Terminal, 
  Clock, 
  Award, 
  BookOpen, 
  Play, 
  Download, 
  ExternalLink, 
  AlertCircle, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface Challenge {
  id: number;
  title: string;
  difficulty: string;
  points: number;
  category: string;
  estimated_time: string;
  description: string;
  is_solved: boolean;
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


export const ChallengeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const challId = parseInt(id || '0', 10);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [lab, setLab] = useState<LabEnvironment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingLab, setIsStartingLab] = useState(false);
  const [flag, setFlag] = useState('');
  const [isSubmittingFlag, setIsSubmittingFlag] = useState(false);
  
  // Feedback states
  const [submissionFeedback, setSubmissionFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    const fetchActiveLab = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/challenges/active', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.challenge_id === challId) {
            setLab(data);
            setSecondsRemaining(data.active_seconds_remaining);
          }
        }
      } catch (err) {
        console.error("Error fetching active lab", err);
      }
    };

    fetchChallengeDetails();
    fetchActiveLab();
  }, [challId, token]);

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

  const fetchChallengeDetails = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/challenges/${challId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setChallenge(data);
      } else {
        navigate('/challenges');
      }
    } catch (err) {
      console.error("Error loading challenge details", err);
      navigate('/challenges');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLab = async () => {
    if (!token) return;
    try {
      setIsStartingLab(true);
      setSubmissionFeedback(null);
      
      const res = await fetch('/api/challenges/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ challenge_id: challId })
      });

      if (res.ok) {
        const data = await res.json();
        setLab(data);
        setSecondsRemaining(data.active_seconds_remaining);
        navigate(`/workspace/${data.instance_name}`);
      } else {
        const errData = await res.json();
        alert(errData.detail || "Failed to start virtual environment.");
      }
    } catch (err) {
      console.error("Error starting lab", err);
    } finally {
      setIsStartingLab(false);
    }
  };

  const handleStopLab = async () => {
    if (!token) {
      setLab(null);
      setSecondsRemaining(0);
      return;
    }
    try {
      const res = await fetch('/api/challenges/terminate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLab(null);
        setSecondsRemaining(0);
      }
    } catch (err) {
      console.error("Error terminating lab", err);
      setLab(null);
      setSecondsRemaining(0);
    }
  };


  const handleSubmitFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flag.trim() || !token) return;

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
          challenge_id: challId,
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
          // Re-fetch details to show SOLVED indicator
          fetchChallengeDetails();
          // Force refresh profile points in navbar
          refreshProfile();
          // Remove from active list
          const activeList = JSON.parse(localStorage.getItem('ctf_started_labs') || '[]');
          const filtered = activeList.filter((id: number) => id !== challId);
          localStorage.setItem('ctf_started_labs', JSON.stringify(filtered));
        }
      }
    } catch (err) {
      console.error("Error submitting flag", err);
    } finally {
      setIsSubmittingFlag(false);
    }
  };

  // Mock static objectives per challenge for premium details representation
  const getObjectives = (id: number) => {
    const isSolved = challenge?.is_solved || false;
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
      case 3:
        return [
          { text: "Access the environment.", completed: isSolved || !!lab },
          { text: "Inspect user listing in '/etc/passwd'.", completed: isSolved },
          { text: "Locate the user account initialized with a custom login shell or specific UID.", completed: isSolved },
          { text: "Extract the secret flag and submit.", completed: isSolved }
        ];
      case 4:
        return [
          { text: "Access the user environment.", completed: isSolved || !!lab },
          { text: "Inspect script code of '/home/ctfuser/retrieve_flag.sh'.", completed: isSolved },
          { text: "Compute the correct inputs required, or extract the base64 encoded flag string.", completed: isSolved },
          { text: "Decode and submit the flag.", completed: isSolved }
        ];
      case 5:
        return [
          { text: "Spawn the analysis target.", completed: isSolved || !!lab },
          { text: "Inspect system log files in '/var/log/auth.log'.", completed: isSolved },
          { text: "Isolate brute force failures and locate the single successful SSH login timestamp.", completed: isSolved },
          { text: "Extract the MD5 formatted flag and submit.", completed: isSolved }
        ];
      default:
        return [
          { text: "Start the training lab.", completed: isSolved || !!lab },
          { text: "Resolve the security objective.", completed: isSolved },
          { text: "Extract and submit the flag.", completed: isSolved }
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
      case 2:
        return [
          { name: "Understanding Linux permissions models", url: "https://linuxjourney.com/page/file-permissions" },
          { name: "Sudo configuration cheatsheet", url: "https://gtfobins.github.io" }
        ];
      default:
        return [
          { name: "Basic Linux Journey Modules", url: "https://linuxjourney.com" },
          { name: "CTF Style Guidelines", url: "https://ctfs.github.io/resources/" }
        ];
    }
  };

  if (isLoading || !challenge) {
    return (
      <div className="flex min-h-[calc(100-16)] items-center justify-center bg-ctfBg">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-ctfBg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        
        {/* Back Link */}
        <Link to="/challenges" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Challenge Catalog
        </Link>

        {/* Primary Page Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Challenge Briefing (Col span 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Info Card */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-6">
              
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 rounded-full bg-slate-550/10 px-3 py-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <BookOpen className="h-3.5 w-3.5" />
                  {challenge.category}
                </span>
                
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${
                    challenge.difficulty === 'Easy' ? 'text-success' :
                    challenge.difficulty === 'Medium' ? 'text-warning' : 'text-danger'
                  }`}>
                    {challenge.difficulty}
                  </span>
                  
                  {challenge.is_solved && (
                    <span className="rounded-md bg-green-50 px-2 py-1 text-[10px] font-bold text-success border border-green-150">
                      SOLVED
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{challenge.title}</h1>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {challenge.estimated_time} estimated</span>
                  <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" /> {challenge.points} points</span>
                </div>
              </div>

              {/* Description */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Challenge Briefing</h3>
                <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-line">
                  {challenge.description}
                </p>
              </div>

              {/* Objectives List */}
              <div className="border-t border-slate-100 pt-6 space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Objectives</h3>
                <ul className="space-y-2.5">
                  {getObjectives(challenge.id).map((obj, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={obj.completed}
                        disabled
                        className="h-4.5 w-4.5 mt-0.5 rounded border-slate-350 text-primary focus:ring-transparent focus:ring-offset-0 disabled:opacity-85"
                      />
                      <span className={obj.completed ? "line-through text-slate-400" : ""}>{obj.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Resources Link Grid */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Resources & External Links</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Downloads Section */}
                  <div className="rounded-xl border border-slate-150 p-4 space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Download className="h-3.5 w-3.5" /> Downloadable Files
                    </span>
                    {lab && challenge.id === 1 ? (
                      <div className="space-y-1.5">
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert("Simulated download trigger for file: cheat-sheet.txt"); }}
                          className="flex items-center justify-between text-xs font-semibold text-primary hover:underline"
                        >
                          <span>cheat-sheet.txt</span>
                          <Download className="h-3.5 w-3.5 text-primary" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 block italic">No assets configured or active. Spawn the lab environment to access downloads.</span>
                    )}
                  </div>

                  {/* Helpful URL guides */}
                  <div className="rounded-xl border border-slate-150 p-4 space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <HelpCircle className="h-3.5 w-3.5" /> Learning Resources
                    </span>
                    <div className="space-y-2 text-xs">
                      {getHelpfulLinks(challenge.id).map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between font-semibold text-secondary hover:underline"
                        >
                          <span>{link.name}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Right Column: Lab simulator & Flag Submit (Col span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Interactive Lab Environment Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                Virtual Lab Environment
              </h2>

              {!lab ? (
                // Lab not started view
                <div className="rounded-xl border border-slate-150 p-6 text-center space-y-4">
                  <p className="text-sm text-slate-500">
                    To start auditing files, testing commands, or scanning logs, spin up a private cloud lab node.
                  </p>
                  
                  <button
                    onClick={handleStartLab}
                    disabled={isStartingLab}
                    className="w-full rounded-xl bg-primary py-3 font-semibold text-white shadow-lg hover:bg-primary-light flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isStartingLab ? (
                      <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Provisioning VM Container...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4.5 w-4.5 fill-current" />
                        <span>Start Virtual Lab</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                // Lab started: Workspace Link View
                <div className="space-y-4">
                  {/* Status Indicator & Countdown */}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-green-50 px-4 py-3 text-xs font-bold text-success border border-green-150 font-sans">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-success animate-pulse" />
                      VM Instance: {lab.instance_name}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-slate-705 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                      {(() => {
                        const h = Math.floor(secondsRemaining / 3600);
                        const m = Math.floor((secondsRemaining % 3600) / 60);
                        const s = secondsRemaining % 60;
                        return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                      })()}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-150 p-6 text-center space-y-4 bg-slate-50">
                    <p className="text-sm text-slate-500 font-sans">
                      Your virtual lab environment is active. Open the secure workspace to access the command terminal.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Link
                        to={`/workspace/${lab.instance_name}`}
                        className="rounded-xl bg-primary py-3 font-semibold text-white shadow-lg hover:bg-primary-light flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-all"
                      >
                        <Terminal className="h-4.5 w-4.5" />
                        <span>Open Workspace</span>
                      </Link>
                      
                      <button
                        onClick={handleStopLab}
                        className="rounded-xl border border-red-200 text-danger py-3 font-semibold hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all"
                      >
                        Terminate Lab
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Flag Submission Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Submit Secret Flag</h2>

              <form onSubmit={handleSubmitFlag} className="space-y-4">
                
                {/* Submit Feedback Notification */}
                {submissionFeedback && (
                  <div className={`rounded-xl p-4 text-sm flex gap-2.5 border ${
                    submissionFeedback.correct
                      ? 'bg-green-50 text-success border-green-100'
                      : 'bg-red-50 text-danger border-red-100'
                  }`}>
                    {submissionFeedback.correct ? (
                      <Sparkles className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-danger" />
                    )}
                    <span>{submissionFeedback.message}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-705 uppercase tracking-wider block">Secret Flag</label>
                  <input
                    type="text"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    disabled={isSubmittingFlag}
                    className="block w-full rounded-lg border border-slate-350 px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors"
                    placeholder="CTF{flag_format_example}"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingFlag || !flag.trim()}
                  className="w-full rounded-xl bg-secondary py-3 font-semibold text-white shadow-lg hover:bg-secondary-light flex items-center justify-center gap-2 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmittingFlag ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Submit Flag"
                  )}
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
