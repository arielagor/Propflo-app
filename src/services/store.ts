import { 
  WorkflowApproval, 
  ApprovalFeedback, 
  MaintenanceRequest, 
  BillItem, 
  RentPayment, 
  LeaseAgreement, 
  UserRole,
  UserProfile,
  ProductivityMetric,
  TenantComplaint,
  TroubleshootingSession
} from '../types';
import { 
  INITIAL_LEASES, 
  INITIAL_APPROVALS, 
  INITIAL_FEEDBACK, 
  INITIAL_MAINTENANCE, 
  INITIAL_BILLS, 
  INITIAL_RENT_PAYMENTS,
  INITIAL_METRICS,
  INITIAL_COMPLAINTS,
  INITIAL_TROUBLESHOOTING
} from './mockData';
import { db, auth, OperationType, handleFirestoreError } from '../firebase/config';
import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';

export interface AppState {
  currentUser: UserProfile;
  leases: LeaseAgreement[];
  approvals: WorkflowApproval[];
  feedback: ApprovalFeedback[];
  maintenance: MaintenanceRequest[];
  bills: BillItem[];
  rentPayments: RentPayment[];
  metrics: ProductivityMetric[];
  complaints: TenantComplaint[];
  troubleshooting: TroubleshootingSession[];
  activeNotification: string | null;
}

const LOCAL_STORAGE_KEY = 'propflow_app_state_v1';

export class DataStore {
  private state: AppState;
  private listeners: Array<() => void> = [];

  constructor() {
    this.state = this.loadInitialState();
  }

  private loadInitialState(): AppState {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          complaints: parsed.complaints || INITIAL_COMPLAINTS,
          troubleshooting: parsed.troubleshooting || INITIAL_TROUBLESHOOTING,
        };
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using seed data');
    }

    return {
      currentUser: {
        id: 'user-pm-1',
        email: 'ariel.agor@gmail.com',
        displayName: 'Ariel Agor',
        role: 'property_manager',
        phone: '(555) 492-7000',
        unit: 'Management Suite 100',
      },
      leases: INITIAL_LEASES,
      approvals: INITIAL_APPROVALS,
      feedback: INITIAL_FEEDBACK,
      maintenance: INITIAL_MAINTENANCE,
      bills: INITIAL_BILLS,
      rentPayments: INITIAL_RENT_PAYMENTS,
      metrics: INITIAL_METRICS,
      complaints: INITIAL_COMPLAINTS,
      troubleshooting: INITIAL_TROUBLESHOOTING,
      activeNotification: null,
    };
  }

  private saveState() {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
    this.notify();
  }

  public getState(): AppState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  public setRole(role: UserRole) {
    let displayName = 'Ariel Agor';
    let unit = 'Management Suite 100';

    if (role === 'lessee') {
      displayName = 'Elena Rostova';
      unit = 'Unit 4B';
    } else if (role === 'finance_officer') {
      displayName = 'Sarah Jenkins';
      unit = 'Finance Dept (Building A)';
    } else if (role === 'vendor_coordinator') {
      displayName = 'Devon Miller';
      unit = 'Operations & Dispatch Desk';
    } else if (role === 'legal_admin') {
      displayName = 'David Stern, Esq.';
      unit = 'General Counsel Office';
    } else if (role === 'executive') {
      displayName = 'Victoria Sterling';
      unit = 'Executive Suite';
    }

    this.state.currentUser = {
      ...this.state.currentUser,
      role,
      displayName,
      unit,
    };
    this.saveState();
  }

  public setAuthUser(user: any) {
    if (!user) return;
    this.state.currentUser = {
      ...this.state.currentUser,
      id: user.uid,
      email: user.email || this.state.currentUser.email,
      displayName: user.displayName || this.state.currentUser.displayName,
      avatar: user.photoURL,
    };
    this.saveState();
  }

  // Workflows & Approvals
  public addApproval(approval: Omit<WorkflowApproval, 'id' | 'createdAt' | 'updatedAt' | 'bottleneckHours'>) {
    const newApproval: WorkflowApproval = {
      ...approval,
      id: `appr-${Date.now().toString().slice(-4)}`,
      bottleneckHours: 0.1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commentsCount: 0,
    };
    this.state.approvals = [newApproval, ...this.state.approvals];
    this.showNotification(`New Approval Initiated: "${newApproval.title}"`);
    this.saveState();

    // Background sync to Firestore
    this.syncDocToFirestore('approvals', newApproval.id, newApproval);
    return newApproval;
  }

  public updateApprovalStatus(id: string, status: WorkflowApproval['status'], reason?: string) {
    this.state.approvals = this.state.approvals.map(appr => {
      if (appr.id === id) {
        return {
          ...appr,
          status,
          updatedAt: new Date().toISOString(),
          currentStage: status === 'approved' ? 'Approved & Ready' : (status === 'rejected' ? 'Rejected' : 'Action Required'),
        };
      }
      return appr;
    });

    if (reason) {
      this.addFeedback(id, reason, status === 'approved' ? 'approval_reason' : 'revision_request');
    }

    this.showNotification(`Workflow ${id.toUpperCase()} updated to ${status.toUpperCase()}`);
    this.saveState();
  }

  public addFeedback(approvalId: string, message: string, type: ApprovalFeedback['type'] = 'comment') {
    const feedbackItem: ApprovalFeedback = {
      id: `fb-${Date.now()}`,
      approvalId,
      authorId: this.state.currentUser.id,
      authorName: this.state.currentUser.displayName,
      authorRole: this.state.currentUser.role,
      message,
      type,
      createdAt: new Date().toISOString(),
    };

    this.state.feedback = [...this.state.feedback, feedbackItem];
    this.state.approvals = this.state.approvals.map(a => 
      a.id === approvalId ? { ...a, commentsCount: (a.commentsCount || 0) + 1 } : a
    );

    this.saveState();
    this.syncDocToFirestore('feedback', feedbackItem.id, feedbackItem);
    return feedbackItem;
  }

  // Maintenance Requests
  public addMaintenanceRequest(data: Omit<MaintenanceRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) {
    const newReq: MaintenanceRequest = {
      ...data,
      id: `maint-${Date.now().toString().slice(-4)}`,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.maintenance = [newReq, ...this.state.maintenance];
    
    // Auto-create approval if emergency or high cost
    if (newReq.priority === 'emergency' || (newReq.estimatedCost && newReq.estimatedCost > 500)) {
      const autoApproval = this.addApproval({
        title: `Emergency Repair: ${newReq.title} (Unit ${newReq.unitNumber})`,
        type: 'maintenance_expense',
        department: 'maintenance',
        amount: newReq.estimatedCost || 750,
        requestedBy: this.state.currentUser.id,
        requestedByName: `${newReq.lesseeName} (Tenant Portal)`,
        targetEntityId: newReq.id,
        currentStage: 'Immediate Dispatch Review',
        requiredRoles: ['property_manager', 'vendor_coordinator'],
        status: 'pending',
        priority: 'urgent',
        description: `Automated maintenance dispatch generated via voice intake. Issue: ${newReq.description}`,
      });
      newReq.approvalId = autoApproval.id;
    }

    this.showNotification(`Maintenance Ticket ${newReq.id.toUpperCase()} logged for Unit ${newReq.unitNumber}`);
    this.saveState();
    this.syncDocToFirestore('maintenance', newReq.id, newReq);
    return newReq;
  }

  public updateMaintenanceStatus(
    id: string, 
    status: MaintenanceRequest['status'], 
    vendorName?: string, 
    contact?: string,
    eta?: string
  ) {
    this.state.maintenance = this.state.maintenance.map(m => {
      if (m.id === id) {
        return {
          ...m,
          status,
          assignedVendor: vendorName || m.assignedVendor,
          vendorContact: contact || m.vendorContact,
          vendorETA: eta || m.vendorETA,
          updatedAt: new Date().toISOString(),
        };
      }
      return m;
    });

    this.showNotification(`Ticket ${id.toUpperCase()} updated: ${status.replace('_', ' ').toUpperCase()}`);
    this.saveState();
  }

  // Bills & Invoices
  public addBill(bill: Omit<BillItem, 'id' | 'createdAt' | 'updatedAt'>) {
    const newBill: BillItem = {
      ...bill,
      id: `bill-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.bills = [newBill, ...this.state.bills];

    // Automatically trigger workflow approval for invoice payout
    this.addApproval({
      title: `Invoice Payment: ${newBill.vendorName} (#${newBill.invoiceNumber})`,
      type: 'vendor_contract',
      department: 'finance',
      amount: newBill.amount,
      requestedBy: this.state.currentUser.id,
      requestedByName: this.state.currentUser.displayName,
      targetEntityId: newBill.id,
      currentStage: 'Finance Sign-off',
      requiredRoles: ['finance_officer', 'property_manager'],
      status: 'pending',
      priority: newBill.amount > 5000 ? 'high' : 'medium',
      description: `Scanned bill extraction verified via Gemini OCR. Due date: ${newBill.dueDate}. Category: ${newBill.billType}.`,
    });

    this.showNotification(`New Bill Added: $${newBill.amount.toFixed(2)} from ${newBill.vendorName}`);
    this.saveState();
    this.syncDocToFirestore('bills', newBill.id, newBill);
    return newBill;
  }

  public updateBillStatus(id: string, status: BillItem['status'], paymentMethod?: string) {
    this.state.bills = this.state.bills.map(b => {
      if (b.id === id) {
        return {
          ...b,
          status,
          paymentMethod: paymentMethod || b.paymentMethod,
          paidAt: status === 'paid' ? new Date().toISOString() : b.paidAt,
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });

    this.showNotification(`Bill ${id.toUpperCase()} marked as ${status.toUpperCase()}`);
    this.saveState();
  }

  // Rent Payments & Collection
  public recordRentPayment(paymentId: string, paymentMethod: string = 'Tenant ACH') {
    this.state.rentPayments = this.state.rentPayments.map(p => {
      if (p.id === paymentId) {
        return {
          ...p,
          status: 'paid',
          paidAt: new Date().toISOString(),
          paymentMethod,
          referenceNumber: `ACH-${Math.floor(10000000 + Math.random() * 90000000)}`,
        };
      }
      return p;
    });

    this.showNotification(`Rent payment confirmed for unit`);
    this.saveState();
  }

  // Leases & E-Signature
  public addLease(lease: Omit<LeaseAgreement, 'id' | 'createdAt' | 'updatedAt'>) {
    const newLease: LeaseAgreement = {
      ...lease,
      id: `lease-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.leases = [newLease, ...this.state.leases];
    this.showNotification(`Lease Agreement Drafted for Unit ${newLease.unitNumber}`);
    this.saveState();
    this.syncDocToFirestore('leases', newLease.id, newLease);
    return newLease;
  }

  public signLease(leaseId: string, signatureDataUrl: string, tenantName: string) {
    this.state.leases = this.state.leases.map(l => {
      if (l.id === leaseId) {
        return {
          ...l,
          status: 'active',
          signatureData: signatureDataUrl,
          tenantName,
          signedAt: new Date().toISOString(),
          signatureIp: '198.51.100.' + Math.floor(Math.random() * 200 + 10),
          termsAccepted: true,
          updatedAt: new Date().toISOString(),
        };
      }
      return l;
    });

    this.showNotification(`Lease Agreement for ${leaseId.toUpperCase()} signed & executed!`);
    this.saveState();
  }

  public attachDriveFileToLease(leaseId: string, driveFileId: string, driveFileName?: string) {
    this.state.leases = this.state.leases.map(l => {
      if (l.id === leaseId) {
        return {
          ...l,
          documentDriveId: driveFileId,
          driveFileName: driveFileName || `Lease_${l.unitNumber}.txt`,
        };
      }
      return l;
    });
    this.saveState();
  }

  // Tenant Complaint Management
  public addComplaint(complaint: Omit<TenantComplaint, 'id' | 'createdAt' | 'updatedAt' | 'responses'>) {
    const newComplaint: TenantComplaint = {
      ...complaint,
      id: `complaint-${Date.now().toString().slice(-4)}`,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      responses: []
    };

    this.state.complaints = [newComplaint, ...this.state.complaints];

    // Connect to Workflow Approvals if high or urgent priority
    if (newComplaint.priority === 'urgent' || newComplaint.priority === 'high') {
      const autoAppr = this.addApproval({
        title: `Tenant Grievance: ${newComplaint.subject} (Unit ${newComplaint.unitNumber})`,
        type: 'legal_addendum',
        department: 'legal',
        amount: 0,
        requestedBy: newComplaint.tenantId,
        requestedByName: newComplaint.isConfidential ? 'Confidential Tenant' : `${newComplaint.tenantName} (${newComplaint.unitNumber})`,
        targetEntityId: newComplaint.id,
        currentStage: 'Compliance Review',
        requiredRoles: ['property_manager', 'legal_admin'],
        status: 'pending',
        priority: newComplaint.priority,
        description: `Renter filed priority grievance in ${newComplaint.category}. Issue: ${newComplaint.description}. Troubleshooting summary: ${newComplaint.troubleshootingSummary || 'N/A'}`
      });
      newComplaint.approvalId = autoAppr.id;
    }

    this.showNotification(`Complaint filed for Unit ${newComplaint.unitNumber}. Management notified.`);
    this.saveState();
    this.syncDocToFirestore('complaints', newComplaint.id, newComplaint);
    return newComplaint;
  }

  public updateComplaintStatus(id: string, status: TenantComplaint['status'], resolutionNotes?: string) {
    this.state.complaints = this.state.complaints.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status,
          resolutionNotes: resolutionNotes || c.resolutionNotes,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    this.showNotification(`Complaint ${id.toUpperCase()} updated: ${status.replace('_', ' ').toUpperCase()}`);
    this.saveState();
  }

  public addComplaintResponse(complaintId: string, message: string, authorName: string, authorRole: string) {
    const responseItem = {
      id: `cr-${Date.now()}`,
      authorName,
      authorRole,
      message,
      createdAt: new Date().toISOString()
    };

    this.state.complaints = this.state.complaints.map(c => {
      if (c.id === complaintId) {
        return {
          ...c,
          responses: [...(c.responses || []), responseItem],
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    this.showNotification(`Reply posted to complaint ${complaintId.toUpperCase()}`);
    this.saveState();
    return responseItem;
  }

  // Troubleshooting Sessions
  public saveTroubleshootingSession(session: Omit<TroubleshootingSession, 'id' | 'createdAt'>) {
    const newSession: TroubleshootingSession = {
      ...session,
      id: `ts-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };

    this.state.troubleshooting = [newSession, ...this.state.troubleshooting];
    this.saveState();
    return newSession;
  }

  public resolveTroubleshootingSession(sessionId: string) {
    this.state.troubleshooting = this.state.troubleshooting.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          status: 'resolved_by_renter',
          resolvedAt: new Date().toISOString()
        };
      }
      return s;
    });
    this.showNotification('🎉 Issue resolved by self-troubleshooting! Vendor dispatch avoided.');
    this.saveState();
  }

  public showNotification(msg: string) {
    this.state.activeNotification = msg;
    this.notify();
    setTimeout(() => {
      if (this.state.activeNotification === msg) {
        this.state.activeNotification = null;
        this.notify();
      }
    }, 4500);
  }

  // Firestore asynchronous syncing with defensive payload handling
  private async syncDocToFirestore(collectionName: string, id: string, data: any) {
    try {
      if (auth.currentUser) {
        await setDoc(doc(db, collectionName, id), data);
      }
    } catch (e) {
      console.warn(`Firestore sync note for ${collectionName}/${id}:`, e);
    }
  }

  public resetToDefault() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    this.state = this.loadInitialState();
    this.notify();
  }
}

export const store = new DataStore();
