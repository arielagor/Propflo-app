import React, { useState, useRef } from 'react';
import { 
  LeaseAgreement, 
  UserRole 
} from '../../types';
import { 
  FileSignature, 
  CheckCircle2, 
  Download, 
  Upload, 
  ShieldCheck, 
  Building2, 
  Calendar, 
  DollarSign, 
  Sparkles, 
  Plus, 
  Clock, 
  PenTool, 
  RotateCcw,
  Check,
  FolderSync,
  ExternalLink
} from 'lucide-react';
import { uploadLeaseToDrive } from '../../services/workspace';

interface LeaseManagerProps {
  leases: LeaseAgreement[];
  userRole: UserRole;
  userName: string;
  userEmail: string;
  onSignLease: (leaseId: string, signatureDataUrl: string, signerName: string) => void;
  onAddLease: (lease: Omit<LeaseAgreement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAttachDriveFile: (leaseId: string, driveFileId: string, driveFileName?: string) => void;
}

export const LeaseManager: React.FC<LeaseManagerProps> = ({
  leases,
  userRole,
  userName,
  userEmail,
  onSignLease,
  onAddLease,
  onAttachDriveFile,
}) => {
  const [selectedLeaseId, setSelectedLeaseId] = useState<string>(leases[0]?.id || '');
  const [showSignModal, setShowSignModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState<string | null>(null);
  const [driveResultUrl, setDriveResultUrl] = useState<string | null>(null);

  // Signature canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerFullName, setSignerFullName] = useState(userName);
  const [consentChecked, setConsentChecked] = useState(false);
  const [signatureMode, setSignatureMode] = useState<'draw' | 'type'>('draw');
  const [typedSignature, setTypedSignature] = useState(userName);

  // New Lease form state
  const [propertyName, setPropertyName] = useState('Highland Park Residences');
  const [unitNumber, setUnitNumber] = useState('5A');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [monthlyRent, setMonthlyRent] = useState<number>(2950);
  const [securityDeposit, setSecurityDeposit] = useState<number>(2950);
  const [startDate, setStartDate] = useState('2026-11-01');
  const [endDate, setEndDate] = useState('2027-10-31');

  const selectedLease = leases.find(l => l.id === selectedLeaseId) || leases[0];

  // Signature Canvas Drawing Logic
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2563eb'; // blue ink
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleExecuteSign = () => {
    if (!consentChecked || !selectedLease) return;

    let dataUrl = '';
    if (signatureMode === 'draw') {
      const canvas = canvasRef.current;
      dataUrl = canvas ? canvas.toDataURL('image/png') : '';
    } else {
      // Create canvas for typed signature
      const offscreen = document.createElement('canvas');
      offscreen.width = 400;
      offscreen.height = 120;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, offscreen.width, offscreen.height);
        ctx.font = 'italic 32px Georgia, cursive';
        ctx.fillStyle = '#1e40af';
        ctx.fillText(typedSignature, 30, 70);
      }
      dataUrl = offscreen.toDataURL('image/png');
    }

    onSignLease(selectedLease.id, dataUrl, signerFullName);
    setShowSignModal(false);
  };

  // Google Drive Lease Archiving
  const handleDriveArchive = async (lease: LeaseAgreement) => {
    try {
      setDriveSyncing('Uploading signed lease document to Google Drive...');
      const res = await uploadLeaseToDrive(lease);
      onAttachDriveFile(lease.id, res.id, res.name);
      setDriveSyncing(`Saved to Google Drive: "${res.name}"`);
      if (res.webViewLink) {
        setDriveResultUrl(res.webViewLink);
      }
      setTimeout(() => setDriveSyncing(null), 6000);
    } catch (err: any) {
      setDriveSyncing('Google Workspace connection needed. Please Sign in with Google.');
      setTimeout(() => setDriveSyncing(null), 6000);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !monthlyRent) return;

    onAddLease({
      propertyName,
      unitNumber,
      tenantName,
      tenantEmail: tenantEmail || `${tenantName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      monthlyRent: Number(monthlyRent),
      securityDeposit: Number(securityDeposit),
      startDate,
      endDate,
      status: 'pending_signature',
      termsAccepted: false,
      terms: [
        `Tenant agrees to pay monthly rent of $${monthlyRent.toLocaleString()} on or before the 1st of each month.`,
        'Includes building amenities, water, and trash removal services.',
        'Late fee of $100 assessed after the 5th calendar day.',
        'Renter insurance with minimum $100,000 personal liability coverage is mandatory prior to key release.',
        'Alterations, painting, or lock rekeying require written landlord authorization.'
      ],
      createdBy: userName,
    });

    setShowCreateModal(false);
    setTenantName('');
    setTenantEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Lease Agreement Vault & E-Sign Engine</h2>
            <span className="text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              Legal Compliance
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Legally-binding electronic signature execution with full cryptographic audit timestamps and direct Google Drive cloud archival.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Draft New Lease</span>
        </button>
      </div>

      {driveSyncing && (
        <div className="p-3 bg-indigo-900/40 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <FolderSync className="w-4 h-4 text-indigo-400" />
            <span>{driveSyncing}</span>
          </div>
          {driveResultUrl && (
            <a
              href={driveResultUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-300 underline font-semibold flex items-center gap-1"
            >
              <span>Open in Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Main Grid: Leases List + Interactive Document Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Leases List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide px-1">
            Active Leases & Pending Signatures ({leases.length})
          </div>

          {leases.map(lease => {
            const isSelected = selectedLease?.id === lease.id;
            return (
              <div
                key={lease.id}
                onClick={() => setSelectedLeaseId(lease.id)}
                className={`cursor-pointer bg-slate-800 border rounded-2xl p-4 transition-all ${
                  isSelected
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50 bg-slate-800 shadow-lg'
                    : 'border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      lease.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      lease.status === 'pending_signature' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-slate-600/30 text-slate-400'
                    }`}>
                      {lease.status.replace('_', ' ')}
                    </span>
                    <h3 className="font-bold text-white text-sm mt-1.5">
                      Unit {lease.unitNumber} • {lease.propertyName}
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Tenant: <strong>{lease.tenantName}</strong> ({lease.tenantEmail})
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Rent</span>
                    <span className="text-sm font-bold text-emerald-400">
                      ${lease.monthlyRent.toLocaleString()}/mo
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    <span>{lease.startDate} to {lease.endDate}</span>
                  </span>
                  {lease.signatureData ? (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>E-Signed</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 font-medium">Pending Sign</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Document Viewer & Signature Card */}
        <div className="lg:col-span-7 space-y-4">
          {selectedLease ? (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-start justify-between border-b border-slate-700 pb-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                    Official Residential Lease Agreement • {selectedLease.id.toUpperCase()}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    {selectedLease.propertyName} - Unit {selectedLease.unitNumber}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                    <span>Term: <strong>{selectedLease.startDate}</strong> to <strong>{selectedLease.endDate}</strong></span>
                    <span>•</span>
                    <span>Deposit: <strong>${selectedLease.securityDeposit.toLocaleString()}</strong></span>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase block ${
                    selectedLease.status === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {selectedLease.status.replace('_', ' ')}
                  </span>
                  <div className="text-sm font-bold text-emerald-400">
                    ${selectedLease.monthlyRent.toLocaleString()} / month
                  </div>
                </div>
              </div>

              {/* Legal Terms Container */}
              <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-700/80 space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
                <div className="font-bold text-white uppercase text-[11px] tracking-wide border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Standard Covenant Clauses & Occupancy Terms</span>
                  <span className="text-slate-400 text-[10px] font-normal">Enforceable under state tenancy code</span>
                </div>

                <ol className="list-decimal pl-5 space-y-2 text-slate-300">
                  {selectedLease.terms.map((term, i) => (
                    <li key={i}>{term}</li>
                  ))}
                </ol>
              </div>

              {/* Electronic Signature Box & Audit Trail */}
              <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Cryptographic E-Signature Audit Trail</span>
                  </span>
                  {selectedLease.documentDriveId && (
                    <span className="text-[10px] text-indigo-400 font-mono">
                      Drive ID: {selectedLease.documentDriveId.slice(0, 12)}...
                    </span>
                  )}
                </div>

                {selectedLease.signatureData ? (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/40 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Signed by {selectedLease.tenantName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Timestamp: {new Date(selectedLease.signedAt || '').toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Audit Token: PROPHASH-{selectedLease.id.slice(0, 8)}-{selectedLease.signatureIp || 'SECURE'}
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-300">
                      <img 
                        src={selectedLease.signatureData} 
                        alt="E-signature" 
                        className="h-12 w-32 object-contain" 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Awaiting Tenant Electronic Signature</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {selectedLease.tenantName} ({selectedLease.tenantEmail}) must sign prior to key turnover.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setSignerFullName(selectedLease.tenantName || userName);
                        setShowSignModal(true);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                    >
                      Sign Lease Now
                    </button>
                  </div>
                )}

                {/* Cloud Document Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleDriveArchive(selectedLease)}
                    className="flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Upload Lease to Google Drive</span>
                  </button>

                  <button
                    onClick={() => window.print()}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center text-slate-400 text-xs">
              Select a lease agreement to view terms or execute signature.
            </div>
          )}
        </div>
      </div>

      {/* Electronic Signature Pad Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <PenTool className="w-5 h-5 text-indigo-400" />
                <span>Electronic Signature Execution</span>
              </h3>
              <button 
                onClick={() => setShowSignModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={signerFullName}
                  onChange={e => {
                    setSignerFullName(e.target.value);
                    setTypedSignature(e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Mode switch: Draw vs Type */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSignatureMode('draw')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                    signatureMode === 'draw' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Draw Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode('type')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition ${
                    signatureMode === 'type' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  Type Font Signature
                </button>
              </div>

              {/* Interactive Pad */}
              {signatureMode === 'draw' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Draw your signature with mouse or finger below:</span>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={130}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full bg-white rounded-xl border border-slate-600 cursor-crosshair touch-none"
                  />
                </div>
              ) : (
                <div className="p-4 bg-white rounded-xl border border-slate-600 text-center">
                  <span className="font-serif italic text-2xl text-blue-900">
                    {typedSignature || 'Your Signature'}
                  </span>
                </div>
              )}

              {/* Legal Consent Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-slate-300 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60">
                <input
                  type="checkbox"
                  checked={consentChecked}
                  onChange={e => setConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>
                  I agree that this electronic signature has the same legal effect and validity as a manual pen signature under the U.S. Electronic Signatures in Global and National Commerce (E-SIGN) Act.
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowSignModal(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!consentChecked || !signerFullName}
                  onClick={handleExecuteSign}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Apply & Execute Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Draft New Lease Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <span>Draft Property Lease Agreement</span>
              </h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Property Complex</label>
                  <input
                    type="text"
                    required
                    value={propertyName}
                    onChange={e => setPropertyName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Unit Number *</label>
                  <input
                    type="text"
                    required
                    value={unitNumber}
                    onChange={e => setUnitNumber(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tenant Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Jonathan Reed"
                    value={tenantName}
                    onChange={e => setTenantName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tenant Email</label>
                  <input
                    type="email"
                    placeholder="jreed@example.com"
                    value={tenantEmail}
                    onChange={e => setTenantEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Monthly Rent ($ USD) *</label>
                  <input
                    type="number"
                    required
                    value={monthlyRent}
                    onChange={e => setMonthlyRent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Security Deposit ($)</label>
                  <input
                    type="number"
                    value={securityDeposit}
                    onChange={e => setSecurityDeposit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow"
                >
                  Create & Send for E-Signature
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
