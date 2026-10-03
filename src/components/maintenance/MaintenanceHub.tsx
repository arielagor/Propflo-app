import React, { useState, useRef, useEffect } from 'react';
import { 
  MaintenanceRequest, 
  UserRole, 
  MaintenanceCategory, 
  MaintenancePriority 
} from '../../types';
import { 
  Mic, 
  MicOff, 
  PhoneCall, 
  Camera, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Send, 
  Truck, 
  Calendar, 
  Sparkles, 
  Upload, 
  Play, 
  Pause,
  ShieldAlert,
  Volume2,
  Building,
  User,
  Check,
  FolderOpen,
  Image as ImageIcon,
  X,
  RotateCcw,
  Plus
} from 'lucide-react';
import { 
  analyzeMaintenancePhoto, 
  transcribeAudioVoice, 
  DamageAnalysisResult 
} from '../../services/geminiClient';
import { scheduleMaintenanceInCalendar, createGoogleTask } from '../../services/workspace';
import { MaintenanceTroubleshooter } from './MaintenanceTroubleshooter';

interface MaintenanceHubProps {
  maintenance: MaintenanceRequest[];
  userRole: UserRole;
  userName: string;
  userEmail: string;
  userUnit?: string;
  onAddRequest: (data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  onUpdateStatus: (id: string, status: MaintenanceRequest['status'], vendor?: string, contact?: string, eta?: string) => void;
}

export const MaintenanceHub: React.FC<MaintenanceHubProps> = ({
  maintenance,
  userRole,
  userName,
  userEmail,
  userUnit = 'Unit 4B',
  onAddRequest,
  onUpdateStatus,
}) => {
  const [selectedTicketId, setSelectedTicketId] = useState<string>(maintenance[0]?.id || '');
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // New ticket state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyName, setPropertyName] = useState('Highland Park Residences');
  const [unitNumber, setUnitNumber] = useState(userUnit);
  const [category, setCategory] = useState<MaintenanceCategory>('plumbing');
  const [priority, setPriority] = useState<MaintenancePriority>('high');
  const [damagePhotos, setDamagePhotos] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [damageAnalysis, setDamageAnalysis] = useState<DamageAnalysisResult | null>(null);
  const [inspectionError, setInspectionError] = useState<{ reason: string } | null>(null);
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Dispatch state
  const [vendorName, setVendorName] = useState('Apex Mechanical & Plumbing Pros');
  const [vendorContact, setVendorContact] = useState('(555) 392-8100');
  const [vendorEta, setVendorEta] = useState('30-45 mins');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState<string | null>(null);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const speechRecognitionRef = useRef<any>(null);

  const selectedTicket = maintenance.find(m => m.id === selectedTicketId) || maintenance[0];

  // Initialize Speech Recognition if supported in browser
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setVoiceTranscript(currentTranscript);
        setDescription(prev => currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition notice:', event.error);
      };

      speechRecognitionRef.current = recognition;
    }
  }, []);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);

        // Convert to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const b64 = reader.result as string;
          setAudioBase64(b64);

          // If browser speech recognition did not catch text, transcribe with Gemini gemini-3.5-transcribe
          if (!voiceTranscript) {
            try {
              setIsTranscribing(true);
              const transRes = await transcribeAudioVoice(b64, 'audio/webm');
              setVoiceTranscript(transRes.transcript);
              setDescription(transRes.transcript);
              if (!title) {
                setTitle(`Voice Request: ${transRes.transcript.slice(0, 40)}...`);
              }
            } catch (err) {
              console.warn('Server transcription note:', err);
            } finally {
              setIsTranscribing(false);
            }
          }
        };

        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);

      // Start browser live recognition
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.start();
        } catch (e) {
          // already started
        }
      }
    } catch (err) {
      console.error('Microphone access denied or unavailable', err);
      alert('Microphone permission required for voice transcription.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
    }
  };

  // Handle Photo damage analysis with gemini-3.1-pro-preview (Supports up to 6 images)
  const handleDamageFilesSelected = async (fileList?: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const availableSlots = 6 - damagePhotos.length;
    if (availableSlots <= 0) {
      alert('Maximum of 6 damage photos allowed per maintenance ticket.');
      return;
    }

    const filesToProcess = filesArray.slice(0, availableSlots);
    setInspectionError(null);

    const newPhotosPromises = filesToProcess.map(file => {
      return new Promise<{ id: string; url: string; name: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: `dmg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            url: reader.result as string,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newPhotos = await Promise.all(newPhotosPromises);
    const updatedPhotos = [...damagePhotos, ...newPhotos].slice(0, 6);
    setDamagePhotos(updatedPhotos);

    // Run damage inspection on all uploaded photos
    runDamageInspectionOnPhotos(updatedPhotos);
  };

  const removeDamagePhoto = (id: string) => {
    const remaining = damagePhotos.filter(p => p.id !== id);
    setDamagePhotos(remaining);
    if (remaining.length > 0) {
      runDamageInspectionOnPhotos(remaining);
    } else {
      setDamageAnalysis(null);
      setInspectionError(null);
    }
  };

  const runDamageInspectionOnPhotos = async (photoList: Array<{ id: string; url: string; name: string }>) => {
    if (photoList.length === 0) return;
    try {
      setIsAnalyzingPhoto(true);
      setInspectionError(null);

      const payload = photoList.map(p => ({
        data: p.url,
        mimeType: 'image/jpeg',
      }));

      const result = await analyzeMaintenancePhoto(payload, description || 'Inspect on-site property damage');
      setDamageAnalysis(result);

      if (result.parsingStatus === 'failed') {
        setInspectionError({
          reason: result.failureReason || 'Photos are too dark or do not show identifiable physical or utility defects.'
        });
      } else {
        // Auto-set priority and trade
        if (result.severityLevel) {
          setPriority(result.severityLevel as MaintenancePriority);
        }
        if (result.recommendedTrade) {
          setCategory(result.recommendedTrade as MaintenanceCategory);
        }
        if (!title && result.triageSummary) {
          setTitle(result.triageSummary);
        }
      }
    } catch (err: any) {
      console.error('Image analysis error', err);
      setInspectionError({
        reason: `Gemini 3.1 Pro analysis error: ${err.message || 'Unable to inspect photos.'}`
      });
    } finally {
      setIsAnalyzingPhoto(false);
    }
  };

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddRequest({
      title,
      description: description || voiceTranscript || 'Voice maintenance request submitted.',
      propertyName,
      unitNumber,
      lesseeId: 'user-active-lessee',
      lesseeName: userName,
      lesseeEmail: userEmail,
      category,
      priority,
      audioTranscript: voiceTranscript || undefined,
      audioUrl: recordedAudioUrl || undefined,
      aiDamageAnalysis: damageAnalysis || undefined,
      estimatedCost: damageAnalysis ? 450 : undefined,
    });

    // Reset
    setTitle('');
    setDescription('');
    setVoiceTranscript('');
    setRecordedAudioUrl(null);
    setDamagePhotos([]);
    setDamageAnalysis(null);
  };

  // Dispatch Vendor & Sync to Google Calendar / Google Tasks
  const handleDispatchVendor = async (ticket: MaintenanceRequest) => {
    try {
      setIsDispatching(true);
      onUpdateStatus(ticket.id, 'vendor_dispatched', vendorName, vendorContact, vendorEta);

      // Try scheduling into Google Calendar and Google Tasks
      try {
        const visitTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await scheduleMaintenanceInCalendar(ticket, visitTime);
        await createGoogleTask(
          `[PropFlow] Dispatch: ${ticket.title} (Unit ${ticket.unitNumber})`,
          `Vendor: ${vendorName} | Contact: ${vendorContact} | Issue: ${ticket.description}`
        );
        setDispatchSuccess(`Dispatched to ${vendorName}. Added to Google Calendar & Google Tasks!`);
      } catch (wsErr) {
        setDispatchSuccess(`Dispatched to ${vendorName}. (Sign in with Google to sync calendar & tasks)`);
      }

      setTimeout(() => setDispatchSuccess(null), 5000);
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Hotline Banner for Lessees */}
      <div className="bg-gradient-to-r from-rose-900/60 via-slate-800 to-indigo-900/60 border border-rose-500/30 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
            <Mic className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base">Realtime Voice Maintenance Hotline</span>
              <span className="text-[10px] uppercase font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full">
                Lessee Instant Intake
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Press record and speak your on-site issue clearly. Gemini transcribes the audio, determines trade urgency, and routes directly to licensed third-party vendors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowTroubleshooter(!showTroubleshooter)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition shadow ${
              showTroubleshooter 
                ? 'bg-indigo-600 text-white border-indigo-500' 
                : 'bg-indigo-950/60 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{showTroubleshooter ? 'Close Troubleshooter' : 'Renter Voice Troubleshooter'}</span>
          </button>

          {!isRecording ? (
            <button
              type="button"
              onClick={startVoiceRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/50 transition transform active:scale-95"
            >
              <Mic className="w-4 h-4" />
              <span>Voice Hotline</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl text-xs font-bold shadow-lg shadow-amber-950/50 transition animate-pulse"
            >
              <MicOff className="w-4 h-4" />
              <span>Stop ({recordingSeconds}s)</span>
            </button>
          )}
        </div>
      </div>

      {showTroubleshooter && (
        <MaintenanceTroubleshooter
          unitNumber={unitNumber}
          tenantName={userName}
          onProceedToTicket={(ticketData) => {
            setTitle(ticketData.title);
            setDescription(ticketData.description);
            setCategory(ticketData.category);
            setPriority(ticketData.priority);
            setDamagePhotos(ticketData.photos);
            setShowTroubleshooter(false);
          }}
          onProceedToComplaint={() => {
            setShowTroubleshooter(false);
          }}
          onResolvedByTenant={() => {
            setShowTroubleshooter(false);
          }}
        />
      )}

      {dispatchSuccess && (
        <div className="p-3 bg-emerald-600/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{dispatchSuccess}</span>
        </div>
      )}

      {/* Main Grid: Submit Form + Active Tickets List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Request Creator with Voice & Photo Analysis */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-indigo-400" />
                <span>Log Maintenance Request</span>
              </h3>
              <span className="text-[11px] text-slate-400">Unit: {unitNumber}</span>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
              {/* Voice Transcript Display */}
              {(isRecording || voiceTranscript || isTranscribing) && (
                <div className="p-3 bg-slate-900/80 border border-rose-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-300 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isRecording ? 'Listening live...' : isTranscribing ? 'Gemini 3.5 Transcribing...' : 'Voice Transcription'}</span>
                    </span>
                    {recordedAudioUrl && (
                      <audio src={recordedAudioUrl} controls className="h-6 w-36" />
                    )}
                  </div>
                  <p className="text-slate-200 text-xs italic bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
                    "{voiceTranscript || (isRecording ? 'Listening to speech...' : 'Transcribing voice...')}"
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Request Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Water leaking under kitchen sink"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Trade Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="plumbing">Plumbing</option>
                    <option value="electrical">Electrical</option>
                    <option value="hvac">HVAC / Heating & Air</option>
                    <option value="structural">Structural / Drywall</option>
                    <option value="appliance">Appliance</option>
                    <option value="general">General Handyman</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none"
                  >
                    <option value="emergency">🚨 Emergency (Immediate Hazard)</option>
                    <option value="high">High Priority</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low Routine</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Description & On-Site Symptoms</label>
                <textarea
                  rows={3}
                  placeholder="Describe location, noises, leak rate, or electrical tripping..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Photo Upload & AI Damage Inspector (Up to 6 photos from camera, library, or files) */}
              <div className="p-3.5 bg-slate-900/60 border border-slate-700/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <span>Attach Damage Photos (Up to 6 Images)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Camera */}
                    <label className="cursor-pointer px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition">
                      <Camera className="w-3 h-3 text-emerald-400" />
                      <span>Camera</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={(e) => handleDamageFilesSelected(e.target.files)}
                        className="hidden"
                      />
                    </label>

                    {/* Files / Library */}
                    <label className="cursor-pointer px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition">
                      <Upload className="w-3 h-3" />
                      <span>Files / Photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleDamageFilesSelected(e.target.files)}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {isAnalyzingPhoto && (
                  <div className="text-center py-3 text-indigo-300 flex items-center justify-center gap-2 text-xs">
                    <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Gemini 3.1 Pro is analyzing structural defects & trade hazards across {damagePhotos.length} photos...</span>
                  </div>
                )}

                {inspectionError && (
                  <div className="p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{inspectionError.reason}</span>
                  </div>
                )}

                {damagePhotos.length > 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {damagePhotos.map((photo) => (
                        <div key={photo.id} className="relative rounded-lg overflow-hidden border border-slate-700 aspect-square group">
                          <img src={photo.url} alt="Damage Angle" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeDamagePhoto(photo.id)}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/70 hover:bg-rose-600 rounded-full text-white flex items-center justify-center text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {damageAnalysis && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Severity:</span>
                          <span className={`px-2 py-0.2 rounded font-bold uppercase ${
                            damageAnalysis.severityLevel === 'emergency' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {damageAnalysis.severityLevel}
                          </span>
                          <span className="text-slate-400">• Recommended Trade: <strong>{damageAnalysis.recommendedTrade}</strong></span>
                        </div>
                        <div>
                          <strong>Identified Defects:</strong> {damageAnalysis.identifiedIssues.join(', ')}
                        </div>
                        <div className="text-amber-300 font-medium">
                          <strong>Immediate Precaution:</strong> {damageAnalysis.suggestedPrecaution}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/50 transition flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Maintenance Request</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Active Ticket Tracking & Vendor Routing Hub */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Active Tickets & 3rd-Party Vendor Routing</span>
              </h3>
              <span className="text-xs text-slate-400">{maintenance.length} Active Work Orders</span>
            </div>

            {/* Tickets selector pills */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {maintenance.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedTicketId(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition ${
                    selectedTicket?.id === item.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow'
                      : 'bg-slate-900/60 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  Unit {item.unitNumber} • {item.category}
                </button>
              ))}
            </div>

            {selectedTicket ? (
              <div className="space-y-4 pt-1">
                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/80 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        selectedTicket.priority === 'emergency' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        selectedTicket.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}>
                        {selectedTicket.priority} • {selectedTicket.category}
                      </span>
                      <h4 className="font-bold text-white text-sm mt-1">{selectedTicket.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{selectedTicket.description}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase block ${
                        selectedTicket.status === 'vendor_dispatched' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        selectedTicket.status === 'completed' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Audio Recording Player if present */}
                  {selectedTicket.audioTranscript && (
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1 text-xs">
                      <div className="text-[10px] font-bold text-rose-300 flex items-center gap-1.5">
                        <Mic className="w-3 h-3" />
                        <span>Tenant Audio Transcript</span>
                      </div>
                      <p className="text-slate-300 italic">"{selectedTicket.audioTranscript}"</p>
                    </div>
                  )}

                  {/* AI Damage Analysis Card */}
                  {selectedTicket.aiDamageAnalysis && (
                    <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/30 text-xs space-y-1.5">
                      <div className="font-bold text-indigo-300 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Gemini Damage Inspection Insights</span>
                      </div>
                      <div className="text-slate-300">
                        <strong>Defects:</strong> {selectedTicket.aiDamageAnalysis.identifiedIssues.join(', ')}
                      </div>
                      <div className="text-amber-300">
                        <strong>Safety Precaution:</strong> {selectedTicket.aiDamageAnalysis.suggestedPrecaution}
                      </div>
                    </div>
                  )}

                  {/* Assigned Vendor Details */}
                  {selectedTicket.assignedVendor ? (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-600/40 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Dispatched: {selectedTicket.assignedVendor}</span>
                        </span>
                        <span className="text-[11px] text-slate-300">ETA: {selectedTicket.vendorETA || 'En route'}</span>
                      </div>
                      <div className="text-slate-400 flex items-center gap-3 text-[11px]">
                        <span>Contact: <strong>{selectedTicket.vendorContact}</strong></span>
                        <span>•</span>
                        <span>Dispatched to Unit {selectedTicket.unitNumber}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Third-Party Vendor Routing & Dispatch Control */}
                <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Dispatch Third-Party Vendor</span>
                    </h5>
                    <span className="text-[10px] text-slate-400">Routes to Licensed Contractor</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Contractor Vendor</label>
                      <input
                        type="text"
                        value={vendorName}
                        onChange={e => setVendorName(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Vendor Phone / ETA</label>
                      <input
                        type="text"
                        value={vendorEta}
                        onChange={e => setVendorEta(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isDispatching}
                      onClick={() => handleDispatchVendor(selectedTicket)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 transition"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>{isDispatching ? 'Dispatching & Scheduling...' : 'Dispatch Vendor & Sync Calendar'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateStatus(selectedTicket.id, 'completed')}
                      className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold transition"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-slate-400">
                No maintenance tickets currently active.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
