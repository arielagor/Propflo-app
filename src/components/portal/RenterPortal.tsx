import React, { useState } from 'react';
import { 
  Building2, 
  Wrench, 
  Receipt, 
  MessageSquareWarning, 
  FileSignature, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Camera, 
  Upload, 
  PhoneCall, 
  Send, 
  Plus, 
  Download, 
  Eye, 
  Sparkles, 
  User, 
  Volume2, 
  FolderSync,
  HelpCircle,
  FileText,
  DollarSign,
  Calendar,
  Lock,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { 
  MaintenanceRequest, 
  RentPayment, 
  LeaseAgreement, 
  TenantComplaint, 
  ComplaintCategory, 
  MaintenanceCategory, 
  MaintenancePriority,
  BillItem
} from '../../types';
import { MaintenanceTroubleshooter } from '../maintenance/MaintenanceTroubleshooter';
import { uploadBillToDrive } from '../../services/workspace';

interface RenterPortalProps {
  tenantName: string;
  tenantEmail: string;
  unitNumber: string;
  propertyName: string;
  lease?: LeaseAgreement;
  rentPayments: RentPayment[];
  maintenance: MaintenanceRequest[];
  complaints: TenantComplaint[];
  onAddMaintenanceRequest: (req: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  onAddComplaint: (comp: Omit<TenantComplaint, 'id' | 'createdAt' | 'updatedAt' | 'responses'>) => void;
  onAddComplaintResponse: (complaintId: string, message: string, authorName: string, authorRole: string) => void;
  onPayRent: (paymentId: string, method: string) => void;
  onAddBill?: (bill: Omit<BillItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onOpenVoiceHotline: () => void;
  onSwitchToManagerView?: () => void;
}

export const RenterPortal: React.FC<RenterPortalProps> = ({
  tenantName = 'Elena Rostova',
  tenantEmail = 'elena.rostova@example.com',
  unitNumber = '4B',
  propertyName = 'Highland Park Residences',
  lease,
  rentPayments,
  maintenance,
  complaints,
  onAddMaintenanceRequest,
  onAddComplaint,
  onAddComplaintResponse,
  onPayRent,
  onAddBill,
  onOpenVoiceHotline,
  onSwitchToManagerView,
}) => {
  const [activePortalTab, setActivePortalTab] = useState<
    'troubleshoot_maintenance' | 'complaints' | 'bill_pay' | 'my_lease'
  >('troubleshoot_maintenance');

  // Sub-view inside maintenance
  const [maintSubView, setMaintSubView] = useState<'troubleshooter' | 'active_tickets'>('troubleshooter');

  // Complaint Filing Form States
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [complaintSubject, setComplaintSubject] = useState('');
  const [complaintCategory, setComplaintCategory] = useState<ComplaintCategory>('noise_disturbance');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);
  const [complaintPriority, setComplaintPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [complaintPhotos, setComplaintPhotos] = useState<Array<{ id: string; url: string; name: string }>>([]);

  // Selected complaint thread
  const [selectedComplaintId, setSelectedComplaintId] = useState<string>(complaints[0]?.id || '');
  const [replyMessage, setReplyMessage] = useState('');

  // Bill Pay States
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'ach' | 'card' | 'apple_pay'>('ach');

  // Filter items for this tenant's unit
  const myMaintenance = maintenance.filter(m => m.unitNumber === unitNumber || m.lesseeName === tenantName);
  const myRentPayments = rentPayments.filter(p => p.unitNumber === unitNumber || p.tenantName === tenantName);
  const myComplaints = complaints.filter(c => c.unitNumber === unitNumber || c.tenantName === tenantName);
  const currentUnpaidRent = myRentPayments.find(p => p.status === 'pending' || p.status === 'overdue');

  const selectedComplaint = complaints.find(c => c.id === selectedComplaintId) || complaints[0];

  // Handle complaint creation
  const handleCreateComplaint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!complaintSubject.trim() || !complaintDescription.trim()) return;

    onAddComplaint({
      unitNumber,
      tenantId: 'user-tenant-1',
      tenantName,
      tenantEmail,
      category: complaintCategory,
      subject: complaintSubject,
      description: complaintDescription,
      status: 'submitted',
      isConfidential,
      priority: complaintPriority,
      photoUrls: complaintPhotos.map(p => p.url)
    });

    setShowComplaintModal(false);
    setComplaintSubject('');
    setComplaintDescription('');
    setComplaintPhotos([]);
  };

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedComplaint) return;
    onAddComplaintResponse(selectedComplaint.id, replyMessage, tenantName, 'Resident');
    setReplyMessage('');
  };

  const executeRentPayment = (paymentId: string) => {
    setIsPaying(true);
    setTimeout(() => {
      onPayRent(paymentId, selectedPaymentMethod === 'ach' ? 'Auto ACH Transfer (Verified)' : 'Credit Card Direct');
      setIsPaying(false);
      setPaymentSuccess(`Rent payment of $${currentUnpaidRent?.amount || 2850} successfully processed!`);
      setTimeout(() => setPaymentSuccess(null), 5000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Resident Identity Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-indigo-900/50">
              {unitNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{tenantName}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Lessee
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-3">
                <span>{propertyName}</span>
                <span>•</span>
                <span>Monthly Rent: <strong>${lease?.monthlyRent || 2850}/mo</strong></span>
                <span>•</span>
                <span>Lease: <strong className="text-emerald-400">Active</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenVoiceHotline}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-900/40 flex items-center gap-1.5 animate-pulse"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Emergency Voice Hotline</span>
            </button>
            {onSwitchToManagerView && (
              <button
                onClick={onSwitchToManagerView}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
              >
                Manager Bureaucracy View
              </button>
            )}
          </div>
        </div>

        {/* Payment Confirmation Alert if any */}
        {paymentSuccess && (
          <div className="mt-4 p-3 bg-emerald-950/60 border border-emerald-500/60 rounded-xl text-xs text-emerald-200 flex items-center gap-2 shadow animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{paymentSuccess}</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActivePortalTab('troubleshoot_maintenance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activePortalTab === 'troubleshoot_maintenance'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4 text-indigo-300" />
          <span>Maintenance & Voice Troubleshooter</span>
          {myMaintenance.filter(m => m.status !== 'completed').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px]">
              {myMaintenance.filter(m => m.status !== 'completed').length} active
            </span>
          )}
        </button>

        <button
          onClick={() => setActivePortalTab('complaints')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activePortalTab === 'complaints'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <MessageSquareWarning className="w-4 h-4 text-amber-300" />
          <span>Complaint & Grievance Hub</span>
          {myComplaints.filter(c => c.status !== 'resolved').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
              {myComplaints.filter(c => c.status !== 'resolved').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActivePortalTab('bill_pay')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activePortalTab === 'bill_pay'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 text-emerald-300" />
          <span>Rent Pay & Ledger</span>
          {currentUnpaidRent && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px]">
              Due ${currentUnpaidRent.amount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActivePortalTab('my_lease')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
            activePortalTab === 'my_lease'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
          }`}
        >
          <FileSignature className="w-4 h-4 text-slate-300" />
          <span>Lease Agreement</span>
        </button>
      </div>

      {/* TAB 1: Maintenance & Interactive Troubleshooter */}
      {activePortalTab === 'troubleshoot_maintenance' && (
        <div className="space-y-6">
          {/* Sub Navigation toggle: Troubleshooter vs Active Tickets */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setMaintSubView('troubleshooter')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  maintSubView === 'troubleshooter'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Real-Time Voice Troubleshooter</span>
              </button>
              <button
                onClick={() => setMaintSubView('active_tickets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  maintSubView === 'active_tickets'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>My Active Work Orders ({myMaintenance.length})</span>
              </button>
            </div>
          </div>

          {maintSubView === 'troubleshooter' ? (
            <MaintenanceTroubleshooter
              unitNumber={unitNumber}
              tenantName={tenantName}
              onProceedToTicket={(ticketData) => {
                onAddMaintenanceRequest({
                  title: ticketData.title,
                  description: ticketData.description,
                  propertyName,
                  unitNumber,
                  lesseeId: 'user-tenant-1',
                  lesseeName: tenantName,
                  lesseeEmail: tenantEmail,
                  category: ticketData.category,
                  priority: ticketData.priority,
                  photoUrls: ticketData.photos.map(p => p.url)
                });
                setMaintSubView('active_tickets');
              }}
              onProceedToComplaint={(complaintData) => {
                onAddComplaint({
                  unitNumber,
                  tenantId: 'user-tenant-1',
                  tenantName,
                  tenantEmail,
                  category: complaintData.category as ComplaintCategory || 'other',
                  subject: complaintData.subject,
                  description: complaintData.description,
                  status: 'submitted',
                  isConfidential: false,
                  priority: 'high',
                  photoUrls: complaintData.photos.map(p => p.url),
                  troubleshootingSummary: complaintData.troubleshootingSummary
                });
                setActivePortalTab('complaints');
              }}
              onResolvedByTenant={(summary) => {
                // Handled in store with notification
              }}
            />
          ) : (
            /* Active Tickets List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Your Maintenance Work Orders</h3>
                <button
                  onClick={() => setMaintSubView('troubleshooter')}
                  className="px-3 py-1.5 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold hover:bg-indigo-600 hover:text-white transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Issue Troubleshooter</span>
                </button>
              </div>

              {myMaintenance.length === 0 ? (
                <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-white">No active maintenance issues!</p>
                  <p className="text-xs text-slate-400 mt-1">Everything in Unit {unitNumber} is running smoothly.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {myMaintenance.map((m) => (
                    <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono bg-slate-800 px-2 py-0.5 rounded">
                            {m.id.toUpperCase()}
                          </span>
                          <h4 className="text-sm font-bold text-white">{m.title}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          m.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          m.status === 'vendor_dispatched' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                          'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {m.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{m.description}</p>

                      {/* Vendor ETA if dispatched */}
                      {m.assignedVendor && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-slate-400">Assigned Vendor: </span>
                            <strong className="text-slate-200">{m.assignedVendor}</strong>
                          </div>
                          {m.vendorETA && (
                            <div>
                              <span className="text-slate-400">Vendor ETA: </span>
                              <strong className="text-emerald-400">{m.vendorETA}</strong>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Photo attachments */}
                      {m.photoUrls && m.photoUrls.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pt-1">
                          {m.photoUrls.map((url, i) => (
                            <img key={i} src={url} alt="Attachment" className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Complaint Management Hub */}
      {activePortalTab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-amber-400" />
                <span>Connected Complaint & Grievance Portal</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Log building defects, neighbor noise, sanitation, or maintenance escalations. Directly synced with property managers.
              </p>
            </div>
            <button
              onClick={() => setShowComplaintModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>File Formal Complaint</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Complaints List */}
            <div className="lg:col-span-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                My Filed Grievances ({myComplaints.length})
              </h4>

              {myComplaints.length === 0 ? (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                  No grievances currently filed.
                </div>
              ) : (
                myComplaints.map(complaint => {
                  const isSelected = complaint.id === selectedComplaint?.id;
                  return (
                    <button
                      key={complaint.id}
                      onClick={() => setSelectedComplaintId(complaint.id)}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        isSelected 
                          ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg' 
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {complaint.category.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          complaint.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          complaint.status === 'action_taken' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' :
                          'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {complaint.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white line-clamp-1">{complaint.subject}</div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{complaint.description}</p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                        <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                        <span>{complaint.responses?.length || 0} response(s)</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right: Active Complaint Feedback Thread */}
            <div className="lg:col-span-7">
              {selectedComplaint ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono text-indigo-400 uppercase font-bold">
                        {selectedComplaint.id.toUpperCase()}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        selectedComplaint.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {selectedComplaint.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white">{selectedComplaint.subject}</h3>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                      {selectedComplaint.description}
                    </p>
                  </div>

                  {/* Conversation Feed */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Management Communication Thread
                    </div>

                    {(!selectedComplaint.responses || selectedComplaint.responses.length === 0) ? (
                      <p className="text-xs text-slate-500 italic">
                        Under initial intake by Property Management. Updates will appear here.
                      </p>
                    ) : (
                      selectedComplaint.responses.map(resp => (
                        <div key={resp.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-indigo-300">{resp.authorName} ({resp.authorRole})</span>
                            <span className="text-slate-500">{new Date(resp.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs text-slate-200">{resp.message}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Reply Input */}
                  <form onSubmit={handlePostReply} className="pt-2 border-t border-slate-800 flex gap-2">
                    <input
                      type="text"
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Add update or reply to property management..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!replyMessage.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                  Select a complaint from the left to view response history.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Bill Pay & Rent Ledger */}
      {activePortalTab === 'bill_pay' && (
        <div className="space-y-6">
          {/* Current Month Rent Card */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-indigo-400 tracking-wider">
                  Current Billing Statement
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  ${lease?.monthlyRent || 2850}.00 USD
                </h3>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                  <span>Period: October 2026</span>
                  <span>•</span>
                  <span>Due: October 1, 2026</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentUnpaidRent ? (
                  <button
                    onClick={() => executeRentPayment(currentUnpaidRent.id)}
                    disabled={isPaying}
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition"
                  >
                    {isPaying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Processing ACH...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Pay Rent Now ($2,850)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="px-4 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Paid in Full (October 2026)
                  </span>
                )}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Select Auto-Pay / Payment Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'ach', label: 'Automated ACH (Checking)', fee: 'No fee' },
                  { id: 'card', label: 'Debit / Credit Card', fee: '2.5% fee' },
                  { id: 'apple_pay', label: 'Apple Pay / Digital Wallet', fee: 'Instant' }
                ].map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentMethod(method.id as any)}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedPaymentMethod === method.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{method.label}</div>
                    <div className="text-[10px] text-slate-400">{method.fee}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payment History Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Payment Ledger History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Reference / ACH</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Date Paid</th>
                    <th className="py-2.5 px-3 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {myRentPayments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-white">{p.period}</td>
                      <td className="py-3 px-3 font-mono font-bold">${p.amount.toFixed(2)}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">{p.referenceNumber || 'N/A'}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          p.status === 'overdue' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
                          'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : 'Pending'}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => alert(`Downloading Receipt #${p.referenceNumber || p.id} for Unit ${unitNumber}`)}
                          className="text-indigo-400 hover:text-indigo-300 underline text-[11px]"
                        >
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: My Lease Agreement */}
      {activePortalTab === 'my_lease' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                Digital Lease Vault
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                Residential Tenancy Agreement — Unit {unitNumber}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Term: June 1, 2026 – May 31, 2027 • Highland Park Residences
              </p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start">
              <ShieldCheck className="w-4 h-4" /> Executed & Verified
            </span>
          </div>

          {/* Key Covenant Terms */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Enforced House Rules & Lease Covenants
            </h4>
            <div className="space-y-2">
              {(lease?.terms || [
                'Tenant agrees to pay monthly rent of $2,850 on or before the 1st calendar day of each month.',
                'Quiet hours observed between 10:00 PM and 7:00 AM daily across all corridors.',
                'Tenant responsible for minor plumbing stoppages caused by misuse; structural repairs handled by building engineering.',
                'Subletting without written prior consent from property manager is strictly prohibited.'
              ]).map((term, i) => (
                <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                    {i + 1}
                  </span>
                  <span>{term}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Signature Verification Block */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <div className="text-slate-400 font-semibold">Tenant Electronic Signature</div>
              <div className="font-serif italic text-lg text-indigo-300 font-bold mt-1">
                Elena Rostova
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Timestamp: May 28, 2026 14:32:00 UTC • IP: 198.51.100.44
              </div>
            </div>

            <button
              onClick={() => alert('Opening lease contract PDF document viewer.')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Download Signed Copy</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: File Formal Complaint */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-amber-400" />
                <span>File Renter Grievance / Complaint</span>
              </h3>
              <button
                onClick={() => setShowComplaintModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateComplaint} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Grievance Category</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value as ComplaintCategory)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="noise_disturbance">Noise Disturbance & Quiet Hours</option>
                  <option value="cleanliness_trash">Cleanliness, Trash & Common Areas</option>
                  <option value="parking_access">Parking & Vehicle Obstruction</option>
                  <option value="pest_environmental">Pest, Odor & Environmental</option>
                  <option value="security_lighting">Security, Gates & Lighting</option>
                  <option value="building_amenities">Building Amenities (Gym, Pool, Laundry)</option>
                  <option value="maintenance_escalation">Unresolved Maintenance Neglect</option>
                  <option value="other">Other Grievance</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Subject</label>
                <input
                  type="text"
                  value={complaintSubject}
                  onChange={(e) => setComplaintSubject(e.target.value)}
                  placeholder="e.g. Repeated excessive noise after 11 PM"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Detailed Description</label>
                <textarea
                  value={complaintDescription}
                  onChange={(e) => setComplaintDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe times, dates, location, and nature of the issue..."
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confidentialCheck"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="confidentialCheck" className="text-xs text-slate-300 cursor-pointer">
                  Submit confidentially (Hide my name from non-executive staff)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowComplaintModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
