import React, { useState } from 'react';
import { 
  FolderSync, 
  CheckCircle2, 
  ExternalLink, 
  Mail, 
  Calendar, 
  FileSpreadsheet, 
  CheckSquare, 
  Users, 
  MessageSquare, 
  HardDrive,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { 
  uploadLeaseToDrive, 
  exportRentRollToSheets, 
  scheduleMaintenanceInCalendar, 
  sendEmailViaGmail, 
  createGoogleTask, 
  syncTenantContact 
} from '../../services/workspace';
import { LeaseAgreement, RentPayment, MaintenanceRequest } from '../../types';

interface WorkspaceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  leases: LeaseAgreement[];
  rentPayments: RentPayment[];
  maintenance: MaintenanceRequest[];
  userEmail: string;
}

export const WorkspaceSyncModal: React.FC<WorkspaceSyncModalProps> = ({
  isOpen,
  onClose,
  leases,
  rentPayments,
  maintenance,
  userEmail,
}) => {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [resultLink, setResultLink] = useState<{ label: string; url: string } | null>(null);

  if (!isOpen) return null;

  // 1. Google Drive Sync
  const handleSyncDrive = async () => {
    const confirmed = window.confirm("Export and archive all signed lease agreements to your personal Google Drive?");
    if (!confirmed) return;

    setActiveAction('drive');
    setStatusMessage('Connecting to Google Drive...');
    setResultLink(null);

    try {
      const signedLeases = leases.filter(l => l.status === 'active' || l.signatureData);
      const targetLease = signedLeases[0] || leases[0];
      if (!targetLease) throw new Error("No lease found to archive.");

      const res = await uploadLeaseToDrive(targetLease);
      setStatusMessage(`Successfully archived "${res.name}" to Google Drive!`);
      if (res.webViewLink) {
        setResultLink({ label: 'Open in Google Drive', url: res.webViewLink });
      }
    } catch (err: any) {
      setStatusMessage(`Drive export note: ${err.message}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 2. Google Sheets Rent Roll Sync
  const handleSyncSheets = async () => {
    const confirmed = window.confirm("Generate a new Google Sheet containing the current property rent roll and payment ledger?");
    if (!confirmed) return;

    setActiveAction('sheets');
    setStatusMessage('Generating Google Spreadsheet...');
    setResultLink(null);

    try {
      const res = await exportRentRollToSheets(rentPayments);
      setStatusMessage('Spreadsheet generated and populated with rent roll ledger!');
      setResultLink({ label: 'Open in Google Sheets', url: res.url });
    } catch (err: any) {
      setStatusMessage(`Sheets export note: ${err.message}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 3. Google Calendar Inspection Event
  const handleSyncCalendar = async () => {
    const confirmed = window.confirm("Add upcoming property maintenance and inspection visits to your Google Calendar?");
    if (!confirmed) return;

    setActiveAction('calendar');
    setStatusMessage('Adding event to Google Calendar...');
    setResultLink(null);

    try {
      const targetReq = maintenance[0];
      if (!targetReq) throw new Error("No maintenance requests available.");

      const eventTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const res = await scheduleMaintenanceInCalendar(targetReq, eventTime);
      setStatusMessage(`Event scheduled in Google Calendar: "${targetReq.title}"`);
      if (res.htmlLink) {
        setResultLink({ label: 'View in Google Calendar', url: res.htmlLink });
      }
    } catch (err: any) {
      setStatusMessage(`Calendar sync note: ${err.message}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 4. Gmail Notification Dispatch
  const handleSendGmailNotification = async () => {
    const confirmed = window.confirm(`Send an automated lease execution and approval alert to ${userEmail} via Gmail?`);
    if (!confirmed) return;

    setActiveAction('gmail');
    setStatusMessage('Dispatching email via Gmail API...');
    setResultLink(null);

    try {
      await sendEmailViaGmail(
        userEmail,
        '[PropFlow] Automated Lease & Maintenance Approval Digest',
        `Hello Ariel,\n\nThis is an automated confirmation from PropFlow Enterprise.\nAll pending approvals have been logged in your dashboard.\nLease records and maintenance transcripts have been processed.\n\nThank you,\nPropFlow Enterprise Real Estate Bureaucracy System`
      );
      setStatusMessage(`Email successfully dispatched via Gmail API to ${userEmail}!`);
    } catch (err: any) {
      setStatusMessage(`Gmail dispatch note: ${err.message}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 5. Google Tasks Creation
  const handleSyncTasks = async () => {
    const confirmed = window.confirm("Create an action task in your Google Tasks for maintenance vendor follow-up?");
    if (!confirmed) return;

    setActiveAction('tasks');
    setStatusMessage('Creating Google Task...');
    setResultLink(null);

    try {
      await createGoogleTask(
        'Verify emergency plumbing valve replacement in Unit 4B',
        'Check invoice against master service agreement cap and sign off in PropFlow dashboard.'
      );
      setStatusMessage('Task added to your default Google Tasks list!');
    } catch (err: any) {
      setStatusMessage(`Google Tasks note: ${err.message}`);
    } finally {
      setActiveAction(null);
    }
  };

  // 6. Google Contacts Sync
  const handleSyncContacts = async () => {
    const confirmed = window.confirm("Sync primary tenant contact (Elena Rostova) into your Google Contacts?");
    if (!confirmed) return;

    setActiveAction('contacts');
    setStatusMessage('Syncing contact to Google Contacts...');
    setResultLink(null);

    try {
      await syncTenantContact('Elena', 'Rostova', 'elena.rostova@example.com', '(555) 492-8812');
      setStatusMessage('Tenant profile saved to your Google Contacts!');
    } catch (err: any) {
      setStatusMessage(`Google Contacts note: ${err.message}`);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center">
              <FolderSync className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Google Workspace Integration Hub</h3>
              <p className="text-xs text-slate-400">
                Synchronize property records, documents, calendars, and communications with permission from the app's users.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Status notification banner */}
        {statusMessage && (
          <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl text-xs text-indigo-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            {resultLink && (
              <a
                href={resultLink.url}
                target="_blank"
                rel="noreferrer"
                className="underline text-emerald-300 font-semibold flex items-center gap-1 shrink-0 ml-3"
              >
                <span>{resultLink.label}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Service Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Google Drive */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-blue-400" />
                <span>Google Drive</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Archive signed lease agreements and contractor bill vouchers directly to Google Drive.
            </p>
            <button
              onClick={handleSyncDrive}
              disabled={activeAction === 'drive'}
              className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              {activeAction === 'drive' ? 'Archiving to Drive...' : 'Archive Signed Lease'}
            </button>
          </div>

          {/* Google Sheets */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Google Sheets</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Export rent roll and billing ledger to a formatted Google Spreadsheet.
            </p>
            <button
              onClick={handleSyncSheets}
              disabled={activeAction === 'sheets'}
              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              {activeAction === 'sheets' ? 'Creating Sheet...' : 'Export Rent Roll Ledger'}
            </button>
          </div>

          {/* Google Calendar */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>Google Calendar</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Schedule on-site vendor maintenance visits and move-in inspection appointments.
            </p>
            <button
              onClick={handleSyncCalendar}
              disabled={activeAction === 'calendar'}
              className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              {activeAction === 'calendar' ? 'Scheduling...' : 'Schedule Visit in Calendar'}
            </button>
          </div>

          {/* Gmail */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-rose-400" />
                <span>Gmail</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Send automated workflow approval updates and tenant notice emails via Gmail API.
            </p>
            <button
              onClick={handleSendGmailNotification}
              disabled={activeAction === 'gmail'}
              className="w-full py-1.5 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              {activeAction === 'gmail' ? 'Sending Mail...' : 'Send Approval Digest Email'}
            </button>
          </div>

          {/* Google Tasks */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-indigo-400" />
                <span>Google Tasks</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Add contractor punch list and inspection reminders to your personal task list.
            </p>
            <button
              onClick={handleSyncTasks}
              disabled={activeAction === 'tasks'}
              className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              {activeAction === 'tasks' ? 'Adding Task...' : 'Create Action Task'}
            </button>
          </div>

          {/* Google Contacts (People API) */}
          <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span>Google Contacts</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sync lessee tenant profiles and emergency vendor numbers with Google Contacts.
            </p>
            <button
              onClick={handleSyncContacts}
              disabled={activeAction === 'contacts'}
              className="w-full py-1.5 px-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-lg font-semibold transition"
            >
              {activeAction === 'contacts' ? 'Syncing...' : 'Sync Tenant to Contacts'}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
