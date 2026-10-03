import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Image as ImageIcon, 
  Search, 
  MapPin, 
  Zap, 
  RefreshCw,
  Compass,
  FileCheck,
  Building2,
  HelpCircle,
  Copy,
  Check,
  CheckCircle2
} from 'lucide-react';
import { 
  sendChatMessage, 
  generatePropertyImage, 
  searchRegulations, 
  findNearbyServices, 
  quickTriageTicket 
} from '../../services/geminiClient';
import { UserRole } from '../../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  image?: string;
  aspectRatio?: string;
  groundingMetadata?: any;
}

interface PropFlowAIChatProps {
  userRole: UserRole;
  userName: string;
}

const ASPECT_RATIOS = [
  { label: '1:1 Square', value: '1:1' },
  { label: '16:9 Landscape', value: '16:9' },
  { label: '9:16 Portrait / Story', value: '9:16' },
  { label: '4:3 Standard Photo', value: '4:3' },
  { label: '3:4 Portrait Photo', value: '3:4' },
  { label: '3:2 Classic 35mm', value: '3:2' },
  { label: '2:3 Vertical Banner', value: '2:3' },
  { label: '21:9 Ultrawide Cinema', value: '21:9' },
];

export const PropFlowAIChat: React.FC<PropFlowAIChatProps> = ({
  userRole,
  userName,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'visuals' | 'search_maps'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-init',
      role: 'model',
      text: `Hello ${userName}! I am PropFlow AI, your real estate bureaucracy and property operations assistant.
I can help you:
• Analyze and draft lease agreement clauses or notice to vacate
• Detect bottleneck causes across departments and advise on workflows
• Answer landlord-tenant compliance questions
• Generate property marketing visuals or architectural staging with custom aspect ratios
• Search real-time municipal rental market rates or find nearby certified contractors using Maps Grounding.

How can I assist your operations today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Visuals generator state
  const [imagePrompt, setImagePrompt] = useState('Modern luxury apartment living room with floor-to-ceiling windows and hardwood floors');
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [generatedImages, setGeneratedImages] = useState<Array<{ url: string; prompt: string; ratio: string; description: string }>>([]);
  const [generatingVisual, setGeneratingVisual] = useState(false);

  // Grounding state
  const [groundingQuery, setGroundingQuery] = useState('');
  const [groundingMode, setGroundingMode] = useState<'search' | 'maps'>('search');
  const [groundingResult, setGroundingResult] = useState<{ text: string; metadata?: any } | null>(null);
  const [groundingLoading, setGroundingLoading] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPrompt.trim() || loading) return;

    const userText = inputPrompt;
    setInputPrompt('');

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newMsg]);
    setLoading(true);

    try {
      // Build conversation history conforming to @google/genai format
      const history = [...messages, newMsg].map(m => ({
        role: m.role,
        parts: [{ text: m.text }],
      }));

      const systemInstruction = `You are PropFlow AI, the senior real estate bureaucracy, lease management, and property maintenance intelligence engine for Apex Horizon Management.
The current operating user is: ${userName} (Role: ${userRole.replace('_', ' ').toUpperCase()}).
Provide concise, legally structured, and highly practical responses. When discussing tenant repairs, reference standard lease covenants and warranty of habitability. When evaluating approvals, suggest specific steps to clear bottlenecks immediately.`;

      const res = await sendChatMessage(history, systemInstruction);

      setMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          role: 'model',
          text: res.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'model',
          text: `Error connecting to Gemini: ${err.message || 'Service temporarily unavailable.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Image Generation with Aspect Ratio Affordance
  const handleGenerateVisual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || generatingVisual) return;

    setGeneratingVisual(true);
    try {
      const res = await generatePropertyImage(imagePrompt, selectedRatio);
      if (res.imageUrl) {
        setGeneratedImages(prev => [
          {
            url: res.imageUrl,
            prompt: imagePrompt,
            ratio: res.aspectRatio,
            description: res.description,
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Image generation notice: ${err.message || 'Error creating image'}`);
    } finally {
      setGeneratingVisual(false);
    }
  };

  // Search or Maps Grounding
  const handleRunGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundingQuery.trim() || groundingLoading) return;

    setGroundingLoading(true);
    setGroundingResult(null);

    try {
      if (groundingMode === 'search') {
        const res = await searchRegulations(groundingQuery);
        setGroundingResult({ text: res.answer, metadata: res.groundingMetadata });
      } else {
        const res = await findNearbyServices(groundingQuery);
        setGroundingResult({ text: res.answer, metadata: res.groundingMetadata });
      }
    } catch (err: any) {
      console.error(err);
      setGroundingResult({ text: `Grounding search error: ${err.message}` });
    } finally {
      setGroundingLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputPrompt(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'chat'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-300" />
            <span>Multi-Turn Gemini Concierge</span>
          </button>

          <button
            onClick={() => setActiveSubTab('visuals')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'visuals'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>Property Visuals (Aspect Ratio Control)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('search_maps')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'search_maps'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Search & Maps Grounding</span>
          </button>
        </div>

        <span className="text-xs text-slate-400 font-medium hidden sm:inline">
          Model: <strong>gemini-3.5-flash & gemini-3.1-pro</strong>
        </span>
      </div>

      {/* VIEW 1: Multi-Turn Chatbot */}
      {activeSubTab === 'chat' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>PropFlow AI Real Estate & Bureaucracy Assistant</span>
              </h3>
              <p className="text-xs text-slate-400">
                Multi-turn conversation with memory, tenancy legal assistance, and bottleneck analysis.
              </p>
            </div>
            <button
              onClick={() => setMessages([messages[0]])}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset History</span>
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => handleQuickPrompt('Draft a 3-day notice to cure covenant breach for unauthorized subletting.')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:border-indigo-500 whitespace-nowrap"
            >
              📄 Draft Notice to Cure
            </button>
            <button
              onClick={() => handleQuickPrompt('Why is our Finance Department review taking 19.4 hours on average? Recommend 3 bottleneck fixes.')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:border-indigo-500 whitespace-nowrap"
            >
              ⏱️ Analyze Bottlenecks
            </button>
            <button
              onClick={() => handleQuickPrompt('What are the legal habitability requirements if a tenant boiler fails during winter?')}
              className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:border-indigo-500 whitespace-nowrap"
            >
              ❄️ Winter Heating Emergency
            </button>
          </div>

          {/* Scrollable Message Thread */}
          <div className="h-[420px] overflow-y-auto space-y-3.5 pr-2 bg-slate-950/40 p-4 rounded-xl border border-slate-700/60">
            {messages.map(m => (
              <div
                key={m.id}
                className={`flex gap-3 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'model' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-xl rounded-2xl p-3.5 space-y-1.5 shadow-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75">
                    <span className="font-bold">{m.role === 'user' ? userName : 'PropFlow AI'}</span>
                    <span>{m.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 text-xs">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 animate-pulse">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 text-slate-300 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>PropFlow AI is analyzing and formulating response...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about approvals, leases, maintenance routing, or tenant laws..."
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputPrompt.trim() || loading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* VIEW 2: Property Visuals Generator with Aspect Ratio Affordance */}
      {activeSubTab === 'visuals' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="border-b border-slate-700 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              <span>AI Property Visual Staging & Image Generation</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Powered by Gemini with full control over aspect ratios (1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9).
            </p>
          </div>

          <form onSubmit={handleGenerateVisual} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Visual Concept / Prompt:
              </label>
              <input
                type="text"
                required
                value={imagePrompt}
                onChange={e => setImagePrompt(e.target.value)}
                placeholder="e.g., Luxury penthouse master bedroom with balcony view over skyline..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Aspect Ratio Selector Affordance */}
            <div>
              <label className="block text-slate-300 font-semibold mb-2">
                Select Aspect Ratio Affordance:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ASPECT_RATIOS.map(ratio => (
                  <button
                    key={ratio.value}
                    type="button"
                    onClick={() => setSelectedRatio(ratio.value)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition ${
                      selectedRatio === ratio.value
                        ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/30'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div>{ratio.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{ratio.value}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={generatingVisual}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>{generatingVisual ? 'Generating Visual Rendering...' : `Generate Image in ${selectedRatio}`}</span>
            </button>
          </form>

          {/* Gallery of Generated Images */}
          {generatedImages.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <h4 className="font-bold text-xs text-white uppercase tracking-wider">
                Generated Property Visuals ({generatedImages.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {generatedImages.map((img, i) => (
                  <div key={i} className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 space-y-2 p-3">
                    <img 
                      src={img.url} 
                      alt={img.prompt} 
                      className="w-full rounded-xl object-cover max-h-72" 
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
                      <span className="font-semibold text-white truncate max-w-[200px]">{img.prompt}</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700 font-mono">
                        {img.ratio}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: Google Search & Google Maps Grounding */}
      {activeSubTab === 'search_maps' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="border-b border-slate-700 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Grounding Intelligence: Real-Time Search & Maps Data</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Access up-to-date real estate municipal data and find certified local vendors using Google Search & Google Maps tools.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-3 text-xs">
            <button
              onClick={() => {
                setGroundingMode('search');
                setGroundingQuery('current average 2-bedroom rent rates in Highland Park and municipal rent control limits');
              }}
              className={`flex-1 py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                groundingMode === 'search'
                  ? 'bg-blue-600 text-white border-blue-400'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Google Search Grounding (Market & Laws)</span>
            </button>

            <button
              onClick={() => {
                setGroundingMode('maps');
                setGroundingQuery('licensed 24-hour commercial emergency plumbing contractors near Highland Park');
              }}
              className={`flex-1 py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${
                groundingMode === 'maps'
                  ? 'bg-emerald-600 text-white border-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-300'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Google Maps Grounding (Vendors & Places)</span>
            </button>
          </div>

          <form onSubmit={handleRunGrounding} className="flex gap-2">
            <input
              type="text"
              required
              value={groundingQuery}
              onChange={e => setGroundingQuery(e.target.value)}
              placeholder={
                groundingMode === 'search' 
                  ? 'Search rent regulations, tenant rights ordinances, inflation index...'
                  : 'Find local emergency electricians, HVAC parts distributors, inspection offices...'
              }
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={groundingLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
            >
              {groundingLoading ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Execute Query</span>
            </button>
          </form>

          {groundingResult && (
            <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-700 space-y-3 text-xs leading-relaxed text-slate-200">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Grounded Result ({groundingMode.toUpperCase()})</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Real-time Verified</span>
              </div>
              <p className="whitespace-pre-wrap text-slate-300">{groundingResult.text}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
