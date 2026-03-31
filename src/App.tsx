import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  History, 
  LayoutDashboard, 
  BookOpen, 
  Settings, 
  LogOut, 
  ChevronRight,
  Loader2,
  Sparkles,
  FileText,
  ListChecks,
  Moon,
  Sun,
  Trash2,
  Type as TypeIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface ResultData {
  summary: string;
  takeaways: string[];
  glossary: { term: string; definition: string }[];
}

interface SavedWork {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  data: ResultData;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('synthetix_user_email');
    }
    return false;
  });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('synthetix_user_email');
    }
    return null;
  });
  const [emailInput, setEmailInput] = useState('');

  // State with functional initializers for localStorage
  const [savedWorks, setSavedWorks] = useState<SavedWork[]>(() => {
    if (typeof window !== 'undefined') {
      const email = localStorage.getItem('synthetix_user_email');
      if (email) {
        const stored = localStorage.getItem(`synthetix_saved_works_${email}`);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {
            return [];
          }
        }
      }
    }
    return [];
  });

  const [aiModel, setAiModel] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synthetix_ai_model');
      return stored || 'gemini-3-flash-preview';
    }
    return 'gemini-3-flash-preview';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('synthetix_theme');
      return stored === 'dark';
    }
    return false;
  });

  // Persist theme changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('synthetix_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('synthetix_theme', 'light');
    }
  }, [isDarkMode]);

  // Persist AI Model changes
  useEffect(() => {
    localStorage.setItem('synthetix_ai_model', aiModel);
  }, [aiModel]);

  const [inputText, setInputText] = useState('');

  const filteredWorks = useMemo(() => {
    if (!searchQuery.trim()) return savedWorks;
    const query = searchQuery.toLowerCase();
    return savedWorks.filter(work => 
      work.title.toLowerCase().includes(query) || 
      work.data.summary.toLowerCase().includes(query)
    );
  }, [savedWorks, searchQuery]);
  
  const handleLoadRecent = (paper: SavedWork) => {
    setResult(paper.data);
    setActiveTab('Dashboard');
    setInputText('');
  };

  const handleDeleteWork = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newWorks = savedWorks.filter(work => work.id !== id);
    setSavedWorks(newWorks);
    if (userEmail) {
      localStorage.setItem(`synthetix_saved_works_${userEmail}`, JSON.stringify(newWorks));
    }
  };

  const handleNewProject = () => {
    setResult(null);
    setInputText('');
    setError(null);
    setActiveTab('Dashboard');
  };

  const handleSynthesize = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      // Check if input contains a URL to provide a better prompt
      const containsUrl = /https?:\/\/[^\s]+/.test(inputText);
      const prompt = containsUrl 
        ? `Please synthesize the content from the provided URL(s) and any accompanying text: ${inputText}`
        : inputText;

      const response = await ai.models.generateContent({
        model: aiModel,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          systemInstruction: `You are an expert research assistant. 
          Synthesize the provided text or content from URLs into a structured JSON format.
          The JSON must strictly follow this structure:
          {
            "summary": "A concise summary of the main points",
            "takeaways": ["Key point 1", "Key point 2", ...],
            "glossary": [
              { "term": "Term 1", "definition": "Definition 1" },
              ...
            ]
          }`,
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              takeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              glossary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING }
                  },
                  required: ["term", "definition"]
                }
              }
            },
            required: ["summary", "takeaways", "glossary"]
          }
        }
      });

      if (!response.text) {
        throw new Error('Empty response from Gemini');
      }

      const data = JSON.parse(response.text);
      setResult(data);

      // Save to history
      const newWork: SavedWork = {
        id: Date.now().toString(),
        title: data.summary.slice(0, 40) + (data.summary.length > 40 ? '...' : ''),
        date: "Just now",
        timestamp: Date.now(),
        data: data
      };
      const updatedWorks = [newWork, ...savedWorks];
      setSavedWorks(updatedWorks);
      if (userEmail) {
        localStorage.setItem(`synthetix_saved_works_${userEmail}`, JSON.stringify(updatedWorks));
      }

    } catch (err) {
      console.error('Synthesis error:', err);
      setError('Failed to synthesize content. Please ensure your Gemini API key is set in the Secrets panel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOut = () => {
    setIsSigningOut(true);
    setTimeout(() => {
      setIsSigningOut(false);
      setIsLoggedIn(false);
      setUserEmail(null);
      setEmailInput('');
      setSavedWorks([]);
      setResult(null);
      localStorage.removeItem('synthetix_user_email');
    }, 800);
  };

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    
    const email = emailInput.trim().toLowerCase();
    setUserEmail(email);
    localStorage.setItem('synthetix_user_email', email);
    
    // Load user-specific data
    const stored = localStorage.getItem(`synthetix_saved_works_${email}`);
    if (stored) {
      try {
        setSavedWorks(JSON.parse(stored));
      } catch (e) {
        setSavedWorks([]);
      }
    } else {
      setSavedWorks([]);
    }
    
    setIsLoggedIn(true);
    setError(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 text-center max-w-md w-full space-y-8"
        >
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto rotate-12 shadow-lg shadow-indigo-500/30">
            <Sparkles className="text-white w-10 h-10" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black tracking-tight dark:text-slate-100 italic">Synthetix</h2>
            <p className="text-slate-500 dark:text-slate-400">Welcome back! Sign in to continue your research synthesis.</p>
          </div>
          
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Email Address</label>
              <input 
                type="email"
                placeholder="e.g. ram@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 rounded-2xl outline-none transition-all dark:text-slate-100"
                required
              />
            </div>
            {error && <p className="text-rose-500 text-sm font-medium">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-indigo-500/20"
            >
              Sign In
            </button>
          </form>
          
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Your research history is synced to your email address.
          </p>
        </motion.div>
      </div>
    );
  }

  if (isSigningOut) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Signing out of your session...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'Dashboard':
        return (
          <div className="space-y-8">
            {/* Input Section */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">Synthesize Research</h2>
              </div>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste research notes, article text, or URLs (e.g., https://example.com) here..."
                className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none text-slate-700 dark:text-slate-200 leading-relaxed"
              />
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/https?:\/\/[^\s]+/.test(inputText) && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-full border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-left-2">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                      URL Context Enabled
                    </span>
                  )}
                </div>
                <button 
                  onClick={handleSynthesize}
                  disabled={isProcessing || !inputText.trim()}
                  className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="animate-spin w-5 h-5" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Synthesize
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </section>

            {/* Results Section */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm"
                >
                  {error}
                </motion.div>
              )}

              {result && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  {/* Summary Card */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center">
                          <FileText className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-slate-100">Executive Summary</h3>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">
                        {result.summary}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                          <ListChecks className="text-emerald-600 dark:text-emerald-400 w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-bold dark:text-slate-100">Key Takeaways</h3>
                      </div>
                      <ul className="space-y-4">
                        {result.takeaways.map((item, idx) => (
                          <li key={idx} className="flex gap-4 items-start">
                            <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                              {idx + 1}
                            </div>
                            <span className="text-slate-600 dark:text-slate-400 leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Glossary Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 h-fit sticky top-24">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center">
                        <TypeIcon className="text-amber-600 dark:text-amber-400 w-5 h-5" />
                      </div>
                      <h3 className="text-xl font-bold dark:text-slate-100">Glossary</h3>
                    </div>
                    <div className="space-y-6">
                      {result.glossary.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">{item.term}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {!result && !isProcessing && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                  <Sparkles size={32} />
                </div>
                <p className="text-lg font-medium">Ready to synthesize your research</p>
                <p className="text-sm">Paste your content above to get started</p>
              </div>
            )}
          </div>
        );
      case 'My Library':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="text-indigo-600 dark:text-indigo-400 w-6 h-6" />
                <h2 className="text-2xl font-bold dark:text-slate-100">My Library</h2>
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {savedWorks.length} {savedWorks.length === 1 ? 'item' : 'items'} saved
              </div>
            </div>

            {savedWorks.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredWorks.map(paper => (
                  <div 
                    key={paper.id}
                    onClick={() => handleLoadRecent(paper)}
                    className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer group relative"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {paper.title}
                        </h3>
                        <p className="text-xs text-slate-400">{paper.date}</p>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteWork(paper.id, e)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                        title="Delete from library"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {paper.data.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {paper.data.takeaways.slice(0, 2).map((t, i) => (
                        <span key={i} className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
                          {t.slice(0, 30)}...
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-4">
                <BookOpen className="mx-auto text-slate-200 dark:text-slate-800 w-16 h-16" />
                <h2 className="text-xl font-bold dark:text-slate-100">Your library is empty</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Synthesize some research on the Dashboard to start building your personal library of knowledge.
                </p>
              </div>
            )}
          </div>
        );
      case 'Recent Work':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-4">
            <History className="mx-auto text-slate-300 dark:text-slate-700 w-16 h-16" />
            <h2 className="text-2xl font-bold dark:text-slate-100">Recent Activity</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">Pick up right where you left off. Your 4 most recent syntheses appear here.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 text-left">
              {savedWorks.length > 0 ? savedWorks.slice(0, 4).map(paper => (
                <div 
                  key={paper.id} 
                  onClick={() => handleLoadRecent(paper)}
                  className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group relative"
                >
                  <div className="flex justify-between items-start">
                    <div className="pr-8">
                      <h4 className="font-bold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 dark:text-slate-200">{paper.title}</h4>
                      <p className="text-xs text-slate-400 mt-1">{paper.date}</p>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-1">
                      <button 
                        onClick={(e) => handleDeleteWork(paper.id, e)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0" />
                    </div>
                  </div>
                </div>
              )) : (
                <div className="col-span-full py-10 text-slate-400 italic">No recent activity yet</div>
              )}
            </div>
            {savedWorks.length > 4 && (
              <button 
                onClick={() => setActiveTab('My Library')}
                className="mt-6 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                View all in Library
              </button>
            )}
          </div>
        );
      case 'Settings':
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 space-y-8">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="text-slate-400 w-6 h-6" />
              <h2 className="text-2xl font-bold dark:text-slate-100">Settings</h2>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <h4 className="font-bold">AI Model Preference</h4>
                  <p className="text-sm text-slate-500">Choose which version of Gemini to use for synthesis.</p>
                </div>
                <select 
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1 text-sm outline-none"
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep)</option>
                </select>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <div>
                  <h4 className="font-bold">Dark Mode</h4>
                  <p className="text-sm text-slate-500">Toggle between light and dark themes.</p>
                </div>
                <button 
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-14 h-7 rounded-full relative transition-all duration-300 shadow-inner overflow-hidden ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
                  aria-label="Toggle Dark Mode"
                >
                  <motion.div 
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    animate={{ 
                      x: isDarkMode ? 28 : 4,
                      rotate: isDarkMode ? 360 : 0
                    }}
                    className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg flex items-center justify-center"
                  >
                    {isDarkMode ? <Moon size={10} className="text-indigo-600" /> : <Sun size={10} className="text-amber-500" />}
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
                    <Sun size={10} className={`transition-opacity duration-300 ${isDarkMode ? 'opacity-0' : 'opacity-40'}`} />
                    <Moon size={10} className={`transition-opacity duration-300 ${isDarkMode ? 'opacity-40' : 'opacity-0'}`} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight">Synthetix</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'Dashboard'} 
            onClick={() => setActiveTab('Dashboard')}
          />
          <NavItem 
            icon={<BookOpen size={20} />} 
            label="My Library" 
            active={activeTab === 'My Library'} 
            onClick={() => setActiveTab('My Library')}
          />
          <NavItem 
            icon={<History size={20} />} 
            label="Recent Work" 
            active={activeTab === 'Recent Work'} 
            onClick={() => setActiveTab('Recent Work')}
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'Settings'} 
            onClick={() => setActiveTab('Settings')}
          />
        </nav>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-1">Signed in as</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate" title={userEmail || ''}>
              {userEmail}
            </p>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-semibold">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search notes..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'My Library') setActiveTab('My Library');
                }}
                className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 w-64 outline-none dark:text-slate-200"
              />
            </div>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button 
              onClick={handleNewProject}
              className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
            >
              <Plus size={18} />
              New Project
            </button>
          </div>
        </header>

        <div className="p-8 overflow-y-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 w-full rounded-xl transition-all ${
      active 
        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold' 
        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
    }`}>
      {icon}
      <span>{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 bg-indigo-600 rounded-full" />}
    </button>
  );
}
