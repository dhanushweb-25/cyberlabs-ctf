import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, Shield, Cpu, TrendingUp, ChevronRight, Terminal as TermIcon, Globe, Lock, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();

  const features = [
    {
      title: "Interactive Linux Labs",
      description: "Learn Linux commands through real-world challenges.",
      icon: Terminal,
      color: "text-primary bg-primary/10"
    },
    {
      title: "CTF Challenges",
      description: "Solve practical cybersecurity exercises.",
      icon: Shield,
      color: "text-secondary bg-secondary/10"
    },
    {
      title: "Cloud Powered Labs",
      description: "Launch isolated environments instantly.",
      icon: Cpu,
      color: "text-purple-600 bg-purple-50"
    },
    {
      title: "Track Progress",
      description: "Monitor learning and challenge completion.",
      icon: TrendingUp,
      color: "text-success bg-green-50"
    }
  ];

  const paths = [
    {
      title: "Linux Fundamentals",
      difficulty: "Beginner",
      desc: "Learn terminal navigation, permission management, files, and users.",
      icon: TermIcon,
      bgColor: "from-teal-500 to-primary",
      time: "4 Hours"
    },
    {
      title: "Networking Basics",
      difficulty: "Beginner",
      desc: "Master network protocols, ports, IP routing, and diagnostic tools.",
      icon: Globe,
      bgColor: "from-blue-400 to-secondary",
      time: "5 Hours"
    },
    {
      title: "Web Security",
      difficulty: "Intermediate",
      desc: "Identify and exploit OWASP Top 10 vulnerabilities like SQL injection.",
      icon: Lock,
      bgColor: "from-amber-500 to-orange-600",
      time: "8 Hours"
    },
    {
      title: "SOC Analyst",
      difficulty: "Intermediate",
      desc: "Investigate security events, analyze authentic logs, and hunt threats.",
      icon: Activity,
      bgColor: "from-violet-500 to-indigo-600",
      time: "10 Hours"
    }
  ];

  return (
    <div className="bg-ctfBg min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 sm:pt-24 sm:pb-36 bg-gradient-to-b from-white via-slate-50 to-ctfBg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Text */}
            <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Vulnerability Playground & Labs
              </span>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.1] sm:leading-[1.1]">
                Learn Cybersecurity Through <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Hands-On</span> CTF Challenges
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0">
                Practice Linux, Networking, Web Security and SOC skills in interactive, gamified labs built for both beginners and experts.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  to={isAuthenticated ? "/dashboard" : "/register"}
                  className="w-full sm:w-auto text-center rounded-xl bg-primary px-8 py-4 font-bold text-white shadow-lg shadow-primary/20 hover:bg-primary-light hover:shadow-primary/30 transition-all hover:scale-[1.02]"
                >
                  Get Started
                </Link>
                {!isAuthenticated && (
                  <Link
                    to="/login"
                    className="w-full sm:w-auto text-center rounded-xl bg-white border border-slate-200 hover:border-slate-300 px-8 py-4 font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>

            {/* Hero Illustration: Interactive Terminal */}
            <div className="lg:col-span-6">
              <div className="relative mx-auto max-w-[500px] lg:max-w-none rounded-2xl bg-slate-900 shadow-2xl overflow-hidden border border-slate-800">
                {/* Header Bar */}
                <div className="flex items-center justify-between bg-slate-950 px-4 py-3 border-b border-slate-850">
                  <div className="flex space-x-1.5">
                    <span className="h-3 w-3 rounded-full bg-danger" />
                    <span className="h-3 w-3 rounded-full bg-warning" />
                    <span className="h-3 w-3 rounded-full bg-success" />
                  </div>
                  <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-success rounded-full animate-ping" />
                    linux-lab-01.local
                  </span>
                  <div className="w-8" />
                </div>
                
                {/* Terminal Body */}
                <div className="p-6 font-mono text-sm space-y-4 text-slate-350 min-h-[300px]">
                  <div>
                    <span className="text-secondary">guest@ctf:~$</span> <span className="text-white">whoami</span>
                    <div className="text-slate-500">guest_account</div>
                  </div>
                  <div>
                    <span className="text-secondary">guest@ctf:~$</span> <span className="text-white">ls -la</span>
                    <div className="grid grid-cols-4 gap-2 text-slate-400 text-xs mt-1">
                      <span>drwxr-xr-x</span> <span>user</span> <span>4096</span> <span className="text-blue-400">.</span>
                      <span>drwxr-xr-x</span> <span>root</span> <span>4096</span> <span className="text-blue-400">..</span>
                      <span>-r--------</span> <span>root</span> <span>32</span> <span className="text-red-400">flag.txt</span>
                      <span>-rwxr-xr-x</span> <span>user</span> <span>845</span> <span className="text-green-400">exploit.sh</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-secondary">guest@ctf:~$</span> <span className="text-white">cat flag.txt</span>
                    <div className="text-red-500 text-xs">cat: flag.txt: Permission denied</div>
                  </div>
                  <div>
                    <span className="text-secondary">guest@ctf:~$</span> <span className="text-white">sudo -l</span>
                    <div className="text-slate-400 text-xs">User guest may run the following commands as root:<br />(root) NOPASSWD: /home/guest/exploit.sh</div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-secondary mr-2">guest@ctf:~$</span>
                    <span className="text-white bg-slate-700/50 px-1 border-r-2 border-white animate-pulse">sudo /home/guest/exploit.sh</span>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Why Learn With CyberLabs?
            </h2>
            <p className="text-slate-600">
              We break down complicated cybersecurity principles into interactive modules that teach you how to think like both an attacker and a defender.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="hover-card rounded-2xl bg-white border border-slate-100 p-6 custom-shadow relative">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${feature.color} mb-5`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Learning Path Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Start Your Learning Path
            </h2>
            <p className="text-slate-600">
              Structured courses designed to guide you step-by-step from IT beginner to professional cybersecurity analyst.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {paths.map((path, idx) => {
              const PathIcon = path.icon;
              return (
                <div key={idx} className="hover-card bg-white rounded-2xl overflow-hidden border border-slate-150 custom-shadow flex flex-col justify-between">
                  <div className={`h-32 bg-gradient-to-r ${path.bgColor} p-6 flex flex-col justify-between relative`}>
                    <span className="self-end rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      {path.difficulty}
                    </span>
                    <PathIcon className="h-8 w-8 text-white opacity-85" />
                  </div>
                  <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{path.title}</h3>
                      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{path.desc}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 font-medium">{path.time} duration</span>
                      <Link 
                        to="/challenges"
                        className="text-primary hover:text-primary-dark font-bold flex items-center gap-0.5 group"
                      >
                        Enroll Now
                        <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
