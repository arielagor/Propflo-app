/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { store, AppState } from './services/store';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { WorkflowDashboard } from './components/dashboard/WorkflowDashboard';
import { MaintenanceHub } from './components/maintenance/MaintenanceHub';
import { BillingManager } from './components/billing/BillingManager';
import { LeaseManager } from './components/leases/LeaseManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { PropFlowAIChat } from './components/ai/PropFlowAIChat';
import { VoiceIntakeModal } from './components/maintenance/VoiceIntakeModal';
import { WorkspaceSyncModal } from './components/workspace/WorkspaceSyncModal';
import { RenterPortal } from './components/portal/RenterPortal';
import { UserRole } from './types';

export default function App() {
  const [state, setState] = useState<AppState>(store.getState());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState({ ...store.getState() });
    });
    return () => unsubscribe();
  }, []);

  const handleRoleChange = (role: UserRole) => {
    store.setRole(role);
    if (role === 'lessee') {
      setActiveTab('renter_portal');
    }
  };

  const counts = {
    pendingApprovals: state.approvals.filter(a => a.status === 'pending').length,
    activeMaintenance: state.maintenance.filter(m => m.status !== 'completed').length,
    unpaidBills: state.bills.filter(b => b.status === 'unpaid' || b.status === 'approved_for_payment').length,
    pendingLeases: state.leases.filter(l => l.status === 'pending_signature').length,
    activeComplaints: (state.complaints || []).filter(c => c.status !== 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentUser={state.currentUser}
        onRoleChange={handleRoleChange}
        activeNotification={state.activeNotification}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onOpenWorkspaceModal={() => setIsWorkspaceModalOpen(true)}
      />

      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole={state.currentUser.role}
          counts={counts}
        />

        {/* Main Content Workspace Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'renter_portal' && (
            <RenterPortal
              tenantName={state.currentUser.role === 'lessee' ? state.currentUser.displayName : 'Elena Rostova'}
              tenantEmail={state.currentUser.role === 'lessee' ? state.currentUser.email : 'elena.rostova@example.com'}
              unitNumber={state.currentUser.role === 'lessee' ? (state.currentUser.unit || 'Unit 4B') : 'Unit 4B'}
              propertyName="Highland Park Residences"
              lease={state.leases.find(l => l.unitNumber === '4B')}
              rentPayments={state.rentPayments}
              maintenance={state.maintenance}
              complaints={state.complaints}
              onAddMaintenanceRequest={req => store.addMaintenanceRequest(req)}
              onAddComplaint={comp => store.addComplaint(comp)}
              onAddComplaintResponse={(compId, msg, author, role) => store.addComplaintResponse(compId, msg, author, role)}
              onPayRent={(paymentId, method) => store.recordRentPayment(paymentId, method)}
              onAddBill={bill => store.addBill(bill)}
              onOpenVoiceHotline={() => setIsVoiceModalOpen(true)}
              onSwitchToManagerView={() => {
                store.setRole('property_manager');
                setActiveTab('dashboard');
              }}
            />
          )}

          {activeTab === 'dashboard' && (
            <WorkflowDashboard
              approvals={state.approvals}
              feedback={state.feedback}
              userRole={state.currentUser.role}
              userName={state.currentUser.displayName}
              onApprove={(id, reason) => store.updateApprovalStatus(id, 'approved', reason)}
              onReject={(id, reason) => store.updateApprovalStatus(id, 'rejected', reason)}
              onRequestChanges={(id, reason) => store.updateApprovalStatus(id, 'changes_requested', reason)}
              onAddFeedback={(approvalId, msg, type) => store.addFeedback(approvalId, msg, type)}
              onCreateApproval={appr => store.addApproval(appr)}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceHub
              maintenance={state.maintenance}
              userRole={state.currentUser.role}
              userName={state.currentUser.displayName}
              userEmail={state.currentUser.email}
              userUnit={state.currentUser.unit}
              onAddRequest={req => store.addMaintenanceRequest(req)}
              onUpdateStatus={(id, status, vendor, contact, eta) => 
                store.updateMaintenanceStatus(id, status, vendor, contact, eta)
              }
            />
          )}

          {activeTab === 'billing' && (
            <BillingManager
              bills={state.bills}
              rentPayments={state.rentPayments}
              userRole={state.currentUser.role}
              userName={state.currentUser.displayName}
              onAddBill={bill => store.addBill(bill)}
              onUpdateBillStatus={(id, status, method) => store.updateBillStatus(id, status, method)}
              onPayRent={(id, method) => store.recordRentPayment(id, method)}
            />
          )}

          {activeTab === 'leases' && (
            <LeaseManager
              leases={state.leases}
              userRole={state.currentUser.role}
              userName={state.currentUser.displayName}
              userEmail={state.currentUser.email}
              onSignLease={(id, sig, name) => store.signLease(id, sig, name)}
              onAddLease={lease => store.addLease(lease)}
              onAttachDriveFile={(id, driveId, name) => store.attachDriveFileToLease(id, driveId, name)}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsDashboard
              metrics={state.metrics}
              pendingApprovalsCount={counts.pendingApprovals}
              totalMaintenanceCount={state.maintenance.length}
              totalLeasesCount={state.leases.length}
              totalBillsCount={state.bills.length}
            />
          )}

          {activeTab === 'ai_concierge' && (
            <PropFlowAIChat
              userRole={state.currentUser.role}
              userName={state.currentUser.displayName}
            />
          )}

          {activeTab === 'workspace' && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <h3 className="text-base font-bold text-white">Google Workspace Connected Services</h3>
                <button
                  onClick={() => setIsWorkspaceModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Open Integration Hub
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                PropFlow Enterprise connects directly with Google Drive (document archival), Google Sheets (rent rolls & ledger), Google Calendar (vendor visits), Gmail (approval digests), Google Tasks (punch lists), and Google Contacts (tenant profiles). Click the button above to launch live synchronization actions.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Lessee Emergency Real-time Voice Call Modal */}
      <VoiceIntakeModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        userName={state.currentUser.displayName}
        userUnit={state.currentUser.unit}
        onSaveRequest={req => store.addMaintenanceRequest(req)}
      />

      {/* Google Workspace Action Modal */}
      <WorkspaceSyncModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        leases={state.leases}
        rentPayments={state.rentPayments}
        maintenance={state.maintenance}
        userEmail={state.currentUser.email}
      />
    </div>
  );
}
