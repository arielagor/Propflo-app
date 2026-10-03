import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic, 
  MicOff, 
  Camera, 
  FolderOpen, 
  Image as ImageIcon, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  Check, 
  ArrowRight, 
  ShieldAlert, 
  HelpCircle, 
  FileText, 
  Send,
  Zap,
  Flame,
  Droplets,
  Wind,
  Info
} from 'lucide-react';
import { 
  MaintenanceCategory, 
  MaintenancePriority, 
  TroubleshootingResult, 
  TroubleshootingStep 
} from '../../types';
import { requestMaintenanceTroubleshooting } from '../../services/geminiClient';

interface MaintenanceTroubleshooterProps {
  unitNumber: string;
  tenantName: string;
  onProceedToTicket: (data: {
    title: string;
    description: string;
    category: MaintenanceCategory;
    priority: MaintenancePriority;
    photos: Array<{ id: string; url: string; name: string }>;
    troubleshootingSummary: string;
  }) => void;
  onProceedToComplaint: (data: {
    subject: string;
    description: string;
    category: string;
    photos: Array<{ id: string; url: string; name: string }>;
    troubleshootingSummary: string;
  }) => void;
  onResolvedByTenant: (summary: string) => void;
}

const COMMON_PRESETS = [
  {
    id: 'disposal',
    title: 'Garbage Disposal Humming',
    category: 'appliance' as MaintenanceCategory,
    icon: Wrench,
    symptom: 'Disposal hums when turned on, but the blades are jammed and not spinning.'
  },
  {
    id: 'gfci',
    title: 'Outlets Have No Power (GFCI)',
    category: 'electrical' as MaintenanceCategory,
    icon: Zap,
    symptom: 'Bathroom or kitchen outlets stopped working, but the main lights are on.'
  },
  {
    id: 'toilet',
    title: 'Toilet Running Constantly',
    category: 'plumbing' as MaintenanceCategory,
    icon: Droplets,
    symptom: 'Water keeps running or hissing in the toilet tank after flushing.'
  },
  {
    id: 'thermostat',
    title: 'AC / Heat Not Turning On',
    category: 'hvac' as MaintenanceCategory,
    icon: Wind,
    symptom: 'Thermostat display is blank or HVAC blower fan is not activating.'
  }
];

export const MaintenanceTroubleshooter: React.FC<MaintenanceTroubleshooterProps> = ({
  unitNumber,
  tenantName,
  onProceedToTicket,
  onProceedToComplaint,
  onResolvedByTenant,
}) => {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MaintenanceCategory>('plumbing');
  const [photos, setPhotos] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Diagnostic Results
  const [result, setResult] = useState<TroubleshootingResult | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<Record<string, boolean>>({});

  // Real-time Voice Speaking States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [currentlySpokenText, setCurrentlySpokenText] = useState<string>('');

  // Voice Input (Listening) States
  const [isListening, setIsListening] = useState(false);
  const speechRecognitionRef = useRef<any>(null);

  // Initialize Speech Synthesis and Voices
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);
          // Prefer natural English voices
          const preferredIdx = voices.findIndex(v => 
            v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
          );
          if (preferredIdx !== -1) {
            setSelectedVoiceIndex(preferredIdx);
          }
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;

      return () => {
        window.speechSynthesis.cancel();
      };
    }
  }, []);

  // Initialize Speech Recognition for Hands-free Voice Input
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setIsListening(false);
          setDescription(prev => prev ? `${prev} ${transcript}` : transcript);
          speakText(`I heard: "${transcript}". Let me analyze the issue.`);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        speechRecognitionRef.current = recognition;
      }
    }
  }, []);

  // Real-time Voice Speech Function
  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel(); // Stop any currently speaking audio

    const cleanText = text.replace(/[*_#`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (availableVoices.length > 0 && availableVoices[selectedVoiceIndex]) {
      utterance.voice = availableVoices[selectedVoiceIndex];
    }
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsSpeechPaused(false);
      setCurrentlySpokenText(cleanText);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      setCurrentlySpokenText('');
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      setCurrentlySpokenText('');
    }
  };

  const togglePauseResume = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeechPaused) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
    } else if (isSpeaking) {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
    }
  };

  // Handle Photo selection (up to 6 images)
  const handleFilesSelected = (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const availableSlots = 6 - photos.length;
    if (availableSlots <= 0) {
      alert('Maximum of 6 photos allowed.');
      return;
    }

    const filesToProcess = filesArray.slice(0, availableSlots);
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => [
          ...prev,
          {
            id: `tp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            url: reader.result as string,
            name: file.name
          }
        ].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const toggleListening = () => {
    if (!speechRecognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      stopSpeaking();
      try {
        speechRecognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn('Speech recognition start error:', e);
      }
    }
  };

  // Run AI Troubleshooting
  const runTroubleshooting = async () => {
    if (!description.trim() && photos.length === 0) {
      alert('Please describe your maintenance symptom or provide at least one photo.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    stopSpeaking();

    try {
      const imagePayload = photos.map(p => ({
        data: p.url,
        mimeType: 'image/jpeg'
      }));

      const res = await requestMaintenanceTroubleshooting(
        imagePayload,
        description,
        category
      );

      const formattedResult: TroubleshootingResult = {
        safetyWarning: res.safetyWarning || '',
        probableCause: res.probableCause,
        canRenterFix: res.canRenterFix,
        urgency: res.urgency,
        recommendedTrade: (res.recommendedTrade as MaintenanceCategory) || category,
        steps: res.steps.map(s => ({
          id: s.id || `step-${s.stepNumber}`,
          stepNumber: s.stepNumber,
          title: s.title,
          instruction: s.instruction,
          spokenInstruction: s.spokenInstruction || s.instruction,
          caution: s.caution,
          completed: false
        })),
        estimatedFixTime: res.estimatedFixTime || '5-10 minutes',
        recommendedTools: res.recommendedTools || [],
        filingRecommendation: res.filingRecommendation
      };

      setResult(formattedResult);
      setActiveStepIndex(0);
      setCompletedStepIds({});

      // Speak opening assessment in realtime!
      if (autoSpeak) {
        let initialSpeech = '';
        if (formattedResult.safetyWarning) {
          initialSpeech += `Warning: ${formattedResult.safetyWarning}. `;
        }
        initialSpeech += `I diagnosed the issue as: ${formattedResult.probableCause}. `;
        if (formattedResult.steps.length > 0) {
          initialSpeech += `Step one: ${formattedResult.steps[0].spokenInstruction}`;
        }
        speakText(initialSpeech);
      }
    } catch (err: any) {
      console.error('Troubleshooting error:', err);
      setAnalysisError(err.message || 'Unable to complete troubleshooting analysis. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyPreset = (preset: typeof COMMON_PRESETS[0]) => {
    setDescription(preset.symptom);
    setCategory(preset.category);
    // Instant voice feedback
    if (autoSpeak) {
      speakText(`Loaded common troubleshooting guide for ${preset.title}. Add photos or click Start Troubleshooting.`);
    }
  };

  const toggleStepCompletion = (stepId: string, idx: number) => {
    const isNowCompleted = !completedStepIds[stepId];
    setCompletedStepIds(prev => ({
      ...prev,
      [stepId]: isNowCompleted
    }));

    // If marked done and autoSpeak is on, advance to next step and speak it out loud!
    if (isNowCompleted && result && result.steps[idx + 1]) {
      const nextStep = result.steps[idx + 1];
      setActiveStepIndex(idx + 1);
      if (autoSpeak) {
        speakText(`Great. Now, Step ${nextStep.stepNumber}: ${nextStep.spokenInstruction}`);
      }
    }
  };

  const speakSpecificStep = (step: TroubleshootingStep) => {
    speakText(`Step ${step.stepNumber}: ${step.title}. ${step.spokenInstruction}`);
  };

  const handleResolveSelf = () => {
    stopSpeaking();
    const summary = result ? `Resolved via troubleshooter: ${result.probableCause}` : 'Resolved by tenant self-troubleshooting';
    speakText('Congratulations! Glad we could solve this together without needing a technician call.');
    onResolvedByTenant(summary);
  };

  const handleEscalateToTicket = () => {
    stopSpeaking();
    if (!result) return;
    onProceedToTicket({
      title: `${result.probableCause.slice(0, 60)} (Unit ${unitNumber})`,
      description: `Tenant self-troubleshooting attempted for Unit ${unitNumber}.\n\nReported Issue: ${description}\n\nDiagnosis: ${result.probableCause}\nSafety Notes: ${result.safetyWarning || 'None'}\nAttempted Steps: ${result.steps.map(s => `Step ${s.stepNumber} (${s.title}): ${completedStepIds[s.id] ? 'Completed' : 'Failed/Skipped'}`).join(', ')}\nFiling Recommendation: ${result.filingRecommendation || 'Professional maintenance dispatch requested.'}`,
      category: result.recommendedTrade,
      priority: result.urgency,
      photos,
      troubleshootingSummary: result.probableCause
    });
  };

  const handleEscalateToComplaint = () => {
    stopSpeaking();
    if (!result) return;
    onProceedToComplaint({
      subject: `Recurring Maintenance Neglect / Unresolved Defect: ${result.probableCause.slice(0, 50)}`,
      description: `Formal grievance regarding habitability defect in Unit ${unitNumber}.\n\nProblem: ${description}\n\nDiagnosis: ${result.probableCause}\nSafety Risk: ${result.safetyWarning || 'Standard habitability standard violated'}\nTroubleshooting attempts were unsuccessful and require landlord corrective action.`,
      category: 'maintenance_escalation',
      photos,
      troubleshootingSummary: result.probableCause
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Top Banner with Real-time Voice Controls */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-slate-800 to-indigo-950/60 p-4 sm:p-6 border-b border-slate-700/80">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-lg shadow-indigo-950/50">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Renter Real-Time Voice Troubleshooter
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Voice-Activated
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Check issues hands-free with real-time spoken guidance and photo diagnostics before filing a formal ticket.
              </p>
            </div>
          </div>

          {/* Voice Speaking Control Bar */}
          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 rounded-xl p-2 px-3 shadow-inner">
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                autoSpeak 
                  ? 'bg-indigo-600 text-white shadow' 
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Toggle automatic speech reading"
            >
              {autoSpeak ? <Volume2 className="w-4 h-4 text-emerald-300" /> : <VolumeX className="w-4 h-4" />}
              <span className="text-[11px] hidden sm:inline">Realtime Voice</span>
            </button>

            {isSpeaking && (
              <div className="flex items-center gap-1 px-2 border-l border-slate-700">
                {/* Live soundwave animation */}
                <div className="flex items-end gap-0.5 h-4 w-6 px-0.5">
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms] h-2"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms] h-4"></span>
                  <span className="w-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms] h-3"></span>
                </div>
                <button
                  onClick={togglePauseResume}
                  className="p-1 text-slate-300 hover:text-white text-xs"
                  title={isSpeechPaused ? 'Resume' : 'Pause'}
                >
                  {isSpeechPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={stopSpeaking}
                  className="p-1 text-slate-400 hover:text-rose-400 text-xs"
                  title="Stop speaking"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Speech Rate Controller */}
            <select
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg text-[10px] text-slate-200 px-1.5 py-1 focus:outline-none"
              title="Voice Speed"
            >
              <option value="0.85">0.85x</option>
              <option value="1.0">1.0x (Normal)</option>
              <option value="1.15">1.15x</option>
            </select>
          </div>
        </div>

        {/* Live Spoken Text Subtitle Bar */}
        {currentlySpokenText && (
          <div className="mt-3 bg-slate-950/80 border border-indigo-500/40 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-indigo-200 shadow-sm animate-pulse">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-semibold text-emerald-400 text-[10px] uppercase tracking-wider">Speaking:</span>
            <span className="truncate text-slate-200 italic font-mono text-[11px]">{currentlySpokenText}</span>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Step 1: Input & Photos (Before Diagnosis) */}
        {!result ? (
          <div className="space-y-6">
            {/* Quick Common Presets */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Quick Diagnostic Presets (Click to Load)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {COMMON_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className="p-3 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/50 rounded-xl text-left transition flex items-start gap-2.5 group"
                    >
                      <div className="p-2 rounded-lg bg-indigo-950/60 border border-indigo-700/40 text-indigo-400 group-hover:text-indigo-300 shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover:text-indigo-200">
                          {preset.title}
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {preset.symptom}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Describe Symptom & Hands-Free Microphone */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>Describe the Malfunction or Symptom</span>
                  <span className="text-[10px] text-slate-400 font-normal">(Speak or type)</span>
                </label>
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow ${
                    isListening 
                      ? 'bg-rose-600 text-white animate-pulse' 
                      : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isListening ? 'Listening... (Click to Stop)' : 'Speak Symptom'}</span>
                </button>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Example: The kitchen sink is dripping under the cabinet near the shutoff valve, and the garbage disposal hums without spinning..."
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition resize-none font-sans"
              />
            </div>

            {/* Up to 6 Photos: Camera, Library, Files, Drag & Drop */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-indigo-400" />
                  <span>Attach Photos for AI Vision Diagnostics</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                    {photos.length} of 6 images
                  </span>
                </label>
                <span className="text-[11px] text-slate-400">
                  Allows camera snapshot, photo library, or file picker
                </span>
              </div>

              {/* Photo Thumbnails */}
              {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-3">
                  {photos.map((photo, idx) => (
                    <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-square">
                      <img src={photo.url} alt={`Inspection Photo ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-1 right-1">
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.id)}
                          className="w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white">
                        Angle #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload & Capture Buttons */}
              {photos.length < 6 && (
                <div className="flex flex-wrap gap-2.5">
                  {/* Camera direct input */}
                  <label className="cursor-pointer px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 transition shadow-sm">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Take Live Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                  </label>

                  {/* Photo library / File picker */}
                  <label className="cursor-pointer px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 rounded-xl text-xs font-semibold text-slate-200 flex items-center gap-2 transition shadow-sm">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>Photo Library / Files</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Error Message if any */}
            {analysisError && (
              <div className="p-3 bg-rose-950/40 border border-rose-600/50 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Troubleshooting Diagnostic Notice</div>
                  <div>{analysisError}</div>
                </div>
              </div>
            )}

            {/* Start Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={runTroubleshooting}
                disabled={isAnalyzing}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Diagnosing with AI Vision & Synthesizing Voice Guide...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Start Real-Time Voice Troubleshooting</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Interactive Troubleshooting Engine with Voice Readout */
          <div className="space-y-6">
            {/* Safety Alert (if hazardous) */}
            {result.safetyWarning ? (
              <div className="p-4 bg-rose-950/60 border-2 border-rose-500/80 rounded-2xl flex items-start gap-3 shadow-lg">
                <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Critical Safety Warning</span>
                    <button
                      onClick={() => speakText(`Safety Warning: ${result.safetyWarning}`)}
                      className="ml-auto text-rose-300 hover:text-white text-[10px] flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" /> Replay Voice
                    </button>
                  </div>
                  <p className="text-xs font-semibold text-rose-100 mt-1 leading-relaxed">
                    {result.safetyWarning}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Diagnosis Summary Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold">Diagnosis:</span>
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 uppercase">
                    {result.recommendedTrade}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    result.urgency === 'emergency' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    result.urgency === 'high' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}>
                    {result.urgency.toUpperCase()} PRIORITY
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Est. Time: <strong className="text-slate-200">{result.estimatedFixTime}</strong></span>
                  {result.recommendedTools && result.recommendedTools.length > 0 && (
                    <span>Tools: <strong className="text-slate-200">{result.recommendedTools.join(', ')}</strong></span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{result.probableCause}</span>
                  <button
                    onClick={() => speakText(`The diagnosis is: ${result.probableCause}`)}
                    className="text-slate-400 hover:text-indigo-300"
                    title="Speak diagnosis"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  {result.canRenterFix 
                    ? '✅ This is safe and typically solvable with simple resident DIY steps below.' 
                    : '⚠️ This requires specialized landlord tools or a licensed contractor.'}
                </p>
              </div>
            </div>

            {/* Step-by-Step Checklist with Realtime Spoken Instructions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>Actionable Diagnostic Steps</span>
                  <span className="text-[10px] text-indigo-400 font-normal">
                    (Click speaker icon to hear in real-time)
                  </span>
                </h4>
                <span className="text-xs text-slate-400">
                  {Object.values(completedStepIds).filter(Boolean).length} of {result.steps.length} completed
                </span>
              </div>

              <div className="space-y-3">
                {result.steps.map((step, idx) => {
                  const isDone = completedStepIds[step.id];
                  const isCurrent = activeStepIndex === idx;

                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-xl border transition ${
                        isDone 
                          ? 'bg-slate-950/40 border-emerald-600/40 opacity-80' 
                          : isCurrent 
                            ? 'bg-indigo-950/30 border-indigo-500/60 shadow-md ring-1 ring-indigo-500/30' 
                            : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleStepCompletion(step.id, idx)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition mt-0.5 ${
                            isDone 
                              ? 'bg-emerald-600 text-white shadow' 
                              : 'bg-slate-800 border border-slate-600 text-slate-300 hover:border-indigo-400'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-bold ${isDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
                              {step.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => speakSpecificStep(step)}
                              className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition"
                            >
                              <Volume2 className="w-3 h-3 text-emerald-400" />
                              <span>Speak Step</span>
                            </button>
                          </div>

                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {step.instruction}
                          </p>

                          {step.caution && (
                            <div className="mt-2 text-[11px] text-amber-300/90 flex items-center gap-1">
                              <Info className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{step.caution}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hands-free Voice Responder Bar */}
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-indigo-300 hover:text-white'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{isListening ? 'Listening for your update...' : 'Speak Update (Hands-Free)'}</span>
                </button>
                <span className="text-[11px] text-slate-400 hidden md:inline">
                  Say "I tried it" or "Still leaking"
                </span>
              </div>

              <button
                type="button"
                onClick={() => setResult(null)}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Restart Diagnostics
              </button>
            </div>

            {/* Outcome Decision Actions: Fixed VS Escalate */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Fixed by Renter */}
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Issue Resolved by Resident</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    The steps worked and the fixture or appliance is now working normally. No vendor dispatch needed!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResolveSelf}
                  className="mt-4 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Mark Fixed & Avoid Ticket</span>
                </button>
              </div>

              {/* Option B: Could Not Resolve -> File Ticket or Complaint */}
              <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-2xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Still Not Working / Defect Remains</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Transfer diagnostic data, {photos.length} photos, and safety ratings directly to management.
                  </p>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleEscalateToTicket}
                    className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center justify-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>File Maintenance Ticket</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleEscalateToComplaint}
                    className="py-2.5 px-3 bg-slate-700 hover:bg-rose-900/60 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition border border-slate-600 hover:border-rose-500/50 flex items-center justify-center gap-1.5"
                    title="File formal complaint if chronic issue or landlord neglect"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>File Complaint</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
