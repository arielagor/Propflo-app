export type UserRole = 
  | 'property_manager'
  | 'lessee'
  | 'finance_officer'
  | 'vendor_coordinator'
  | 'executive'
  | 'legal_admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  phone?: string;
  unit?: string;
  avatar?: string;
}

export type ApprovalType = 
  | 'lease_agreement'
  | 'maintenance_expense'
  | 'vendor_contract'
  | 'rent_adjustment'
  | 'legal_addendum';

export type Department = 
  | 'leasing'
  | 'maintenance'
  | 'finance'
  | 'legal'
  | 'executive';

export type ApprovalStatus = 
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export interface WorkflowApproval {
  id: string;
  title: string;
  type: ApprovalType;
  department: Department;
  amount?: number;
  requestedBy: string;
  requestedByName: string;
  targetEntityId?: string;
  currentStage: string;
  requiredRoles: UserRole[];
  status: ApprovalStatus;
  bottleneckHours: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  description?: string;
  commentsCount?: number;
}

export interface ApprovalFeedback {
  id: string;
  approvalId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  message: string;
  type: 'comment' | 'revision_request' | 'waiver' | 'approval_reason';
  createdAt: string;
}

export type MaintenanceCategory = 
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'structural'
  | 'appliance'
  | 'general';

export type MaintenancePriority = 'emergency' | 'high' | 'medium' | 'low';

export type MaintenanceStatus = 
  | 'submitted'
  | 'under_review'
  | 'vendor_dispatched'
  | 'work_in_progress'
  | 'completed'
  | 'cancelled';

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  propertyName: string;
  unitNumber: string;
  lesseeId: string;
  lesseeName: string;
  lesseeEmail: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  audioTranscript?: string;
  audioUrl?: string;
  photoUrls?: string[];
  aiDamageAnalysis?: {
    identifiedIssues: string[];
    severityLevel: string;
    recommendedTrade: string;
    estimatedRepairTime: string;
    suggestedPrecaution: string;
  };
  assignedVendor?: string;
  vendorContact?: string;
  vendorETA?: string;
  estimatedCost?: number;
  actualCost?: number;
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

export type BillType = 
  | 'utility'
  | 'contractor_invoice'
  | 'property_tax'
  | 'maintenance_receipt'
  | 'insurance';

export type BillStatus = 'unpaid' | 'approved_for_payment' | 'paid' | 'disputed';

export interface BillItem {
  id: string;
  billType: BillType;
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  status: BillStatus;
  photoUrl?: string;
  ocrConfidence?: number;
  extractedLineItems?: Array<{ description: string; amount: number }>;
  driveFileId?: string;
  submittedBy: string;
  paymentMethod?: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface RentPayment {
  id: string;
  leaseId: string;
  unitNumber: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  period: string; // e.g., "October 2026"
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  createdAt: string;
}

export type LeaseStatus = 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';

export interface LeaseAgreement {
  id: string;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  tenantEmail: string;
  tenantId?: string;
  monthlyRent: number;
  securityDeposit: number;
  startDate: string;
  endDate: string;
  status: LeaseStatus;
  signatureData?: string; // Base64 data URL
  signatureIp?: string;
  signedAt?: string;
  termsAccepted: boolean;
  documentDriveId?: string;
  driveFileName?: string;
  terms: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductivityMetric {
  department: Department;
  avgResolutionHours: number;
  slaComplianceRate: number; // percentage
  tasksProcessed: number;
  activeBottlenecks: number;
}

export type ComplaintCategory = 
  | 'noise_disturbance'
  | 'cleanliness_trash'
  | 'parking_access'
  | 'pest_environmental'
  | 'security_lighting'
  | 'building_amenities'
  | 'other';

export type ComplaintStatus = 
  | 'submitted'
  | 'under_investigation'
  | 'action_taken'
  | 'resolved';

export interface ComplaintResponse {
  id: string;
  authorName: string;
  authorRole: string;
  message: string;
  createdAt: string;
}

export interface TenantComplaint {
  id: string;
  unitNumber: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  isConfidential: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  photoUrls?: string[];
  troubleshootingAttempted?: boolean;
  troubleshootingSummary?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvalId?: string;
  responses?: ComplaintResponse[];
}

export interface TroubleshootingStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  spokenInstruction: string;
  caution?: string;
  completed?: boolean;
}

export interface TroubleshootingResult {
  safetyWarning?: string;
  probableCause: string;
  canRenterFix: boolean;
  urgency: MaintenancePriority;
  recommendedTrade: MaintenanceCategory;
  steps: TroubleshootingStep[];
  estimatedFixTime?: string;
  recommendedTools?: string[];
  filingRecommendation?: string;
}

export interface TroubleshootingSession {
  id: string;
  tenantId: string;
  unitNumber: string;
  issueDescription: string;
  photoUrls: string[];
  result?: TroubleshootingResult;
  status: 'in_progress' | 'resolved_by_renter' | 'escalated_to_maintenance' | 'escalated_to_complaint';
  createdAt: string;
  resolvedAt?: string;
}
