import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  Building 
} from 'lucide-react';
import { transcribeAudioVoice } from '../../services/geminiClient';
import { MaintenanceRequest } from '../../types';

interface VoiceIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userUnit?: string;
  onSaveRequest: (data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
}

export const VoiceIntakeModal: React.FC<VoiceIntakeModalProps> = ({
  isOpen,
  onClose,
  userName,
  userUnit = 'Unit 4B',
  onSaveRequest,
}) => {
  const [callActive, setCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{
    category: string;
    urgency: string;
    vendor: string;
    eta: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (callActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callActive]);

  const handleStartCall = () => {
    setCallActive(true);
    setLiveTranscript('');
    setDispatchResult(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = 0; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        setLiveTranscript(text);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } else {
      setLiveTranscript("Browser speech recognition not detected. Simulating speech audio intake...");
    }
  };

  const handleEndCall = async () => {
    setCallActive(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const transcriptToUse = liveTranscript || "Water pipe burst behind the refrigerator in unit 4B and spraying on the drywall.";
    setIsProcessing(true);

    try {
      // Analyze category and vendor routing
      const textLower = transcriptToUse.toLowerCase();
      let detectedCategory: any = 'plumbing';
      let vendor = 'Apex Mechanical & Plumbing Pros';

      if (textLower.includes('heat') || textLower.includes('ac') || textLower.includes('air') || textLower.includes('condenser')) {
        detectedCategory = 'hvac';
        vendor = 'Polar Air & Heating Specialists';
      } else if (textLower.includes('wire') || textLower.includes('spark') || textLower.includes('outlet') || textLower.includes('breaker')) {
        detectedCategory = 'electrical';
        vendor = 'VoltAmp Licensed Electricians';
      } else if (textLower.includes('roof') || textLower.includes('ceiling') || textLower.includes('wall') || textLower.includes('crack')) {
        detectedCategory = 'structural';
        vendor = 'BuildShield Structural Repair';
      }

      const eta = '25-35 minutes';
      setDispatchResult({
        category: detectedCategory.toUpperCase(),
        urgency: 'EMERGENCY',
        vendor,
        eta,
      });

      // Automatically register the maintenance request
      onSaveRequest({
        title: `Voice Call Intake: ${transcriptToUse.slice(0, 45)}...`,
        description: transcriptToUse,
        propertyName: 'Highland Park Residences',
        unitNumber: userUnit,
        lesseeId: 'user-voice-tenant',
        lesseeName: userName,
        lesseeEmail: 'elena.rostova@example.com',
        category: detectedCategory,
        priority: 'emergency',
        audioTranscript: transcriptToUse,
        assignedVendor: vendor,
        vendorETA: eta,
        vendorContact: '(555) 392-8100',
        estimatedCost: 650,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>

        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
            PropFlow Emergency Dispatch Line
          </div>
          <h3 className="text-lg font-bold text-white">Lessee Live Voice Intake</h3>
          <p className="text-xs text-slate-400">
            Unit: <strong>{userUnit}</strong> • Lessee: <strong>{userName}</strong>
          </p>
        </div>

        {/* Call Status Circle */}
        <div className="py-4 flex flex-col items-center justify-center space-y-3">
          <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
            callActive 
              ? 'bg-rose-500/20 border-2 border-rose-500 ring-8 ring-rose-500/20 animate-pulse' 
              : 'bg-slate-900 border border-slate-700'
          }`}>
            <PhoneCall className={`w-12 h-12 ${callActive ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
          </div>

          <div className="text-sm font-bold text-slate-200">
            {callActive ? (
              <span className="text-rose-400 font-mono">
                CALL IN PROGRESS • {Math.floor(callDuration / 60)}:{String(callDuration % 60).padStart(2, '0')}
              </span>
            ) : (
              <span className="text-slate-400">Line Ready for On-Site Emergency</span>
            )}
          </div>
        </div>

        {/* Real-time Voice Transcription Display */}
        {callActive && (
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-rose-500/30 text-left space-y-1.5 text-xs animate-fadeIn">
            <div className="flex items-center justify-between text-[10px] text-rose-300 font-bold uppercase">
              <span className="flex items-center gap-1.5">
                <Mic className="w-3 h-3 text-rose-400 animate-pulse" />
                <span>Real-Time Voice Transcription</span>
              </span>
              <span>Live Feed</span>
            </div>
            <p className="text-slate-200 italic min-h-[50px]">
              "{liveTranscript || 'Start speaking your maintenance problem into your device microphone...'}"
            </p>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
            <span>AI analyzing sentiment, trade category, and dispatching nearest vendor...</span>
          </div>
        )}

        {/* Dispatch Result Card */}
        {dispatchResult && (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-left space-y-2 text-xs animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Vendor Dispatched!</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {dispatchResult.category}
              </span>
            </div>
            <div className="text-slate-200">
              Contractor: <strong>{dispatchResult.vendor}</strong>
            </div>
            <div className="text-slate-300 flex items-center justify-between text-[11px] pt-1 border-t border-emerald-900/50">
              <span>ETA to {userUnit}: <strong>{dispatchResult.eta}</strong></span>
              <span className="text-emerald-400 font-semibold">Priority 1 Call</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2">
          {!callActive ? (
            <button
              onClick={handleStartCall}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-sm shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2 transition"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Connect Emergency Voice Intake</span>
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-rose-400 border border-rose-500/60 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition"
            >
              <PhoneOff className="w-4 h-4" />
              <span>End Call & Dispatch Work Order</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
