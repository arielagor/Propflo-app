import React, { useState } from 'react';
import { 
  BillItem, 
  RentPayment, 
  UserRole, 
  BillType 
} from '../../types';
import { 
  Camera, 
  Upload, 
  Receipt, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  CreditCard, 
  Building, 
  Sparkles, 
  FileText, 
  ArrowUpRight, 
  Plus,
  Send,
  Download,
  AlertCircle,
  FolderOpen,
  Image as ImageIcon,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { analyzeBillPhoto, BillExtractionResult } from '../../services/geminiClient';
import { uploadBillToDrive, exportRentRollToSheets } from '../../services/workspace';

interface BillingManagerProps {
  bills: BillItem[];
  rentPayments: RentPayment[];
  userRole: UserRole;
  userName: string;
  onAddBill: (bill: Omit<BillItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateBillStatus: (id: string, status: BillItem['status'], method?: string) => void;
  onPayRent: (paymentId: string, method: string) => void;
}

export const BillingManager: React.FC<BillingManagerProps> = ({
  bills,
  rentPayments,
  userRole,
  userName,
  onAddBill,
  onUpdateBillStatus,
  onPayRent,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'bills' | 'rent_roll'>('bills');
  const [isScanning, setIsScanning] = useState(false);
  const [photos, setPhotos] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [extractedData, setExtractedData] = useState<BillExtractionResult | null>(null);
  const [parsingError, setParsingError] = useState<{ reason: string; suggestions?: string[] } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [sheetExportStatus, setSheetExportStatus] = useState<string | null>(null);
  const [driveUploadStatus, setDriveUploadStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Manual bill form overrides
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [billType, setBillType] = useState<BillType>('contractor_invoice');
  const [notes, setNotes] = useState('');

  // Handle Photo of Bill from Library, Files, or Camera (supports up to 6 images)
  const handleFilesSelected = async (fileList?: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const availableSlots = 6 - photos.length;
    if (availableSlots <= 0) {
      alert('Maximum of 6 images allowed per bill.');
      return;
    }

    const filesToProcess = filesArray.slice(0, availableSlots);
    setParsingError(null);

    const newPhotosPromises = filesToProcess.map(file => {
      return new Promise<{ id: string; url: string; name: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            url: reader.result as string,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const newPhotos = await Promise.all(newPhotosPromises);
    const updatedPhotos = [...photos, ...newPhotos].slice(0, 6);
    setPhotos(updatedPhotos);

    // Run OCR analysis on all photos
    runOcrOnPhotos(updatedPhotos);
  };

  const removePhoto = (id: string) => {
    const remaining = photos.filter(p => p.id !== id);
    setPhotos(remaining);
    if (remaining.length > 0) {
      runOcrOnPhotos(remaining);
    } else {
      setExtractedData(null);
      setParsingError(null);
    }
  };

  const runOcrOnPhotos = async (photoList: Array<{ id: string; url: string; name: string }>) => {
    if (photoList.length === 0) return;
    try {
      setIsScanning(true);
      setParsingError(null);
      
      const payload = photoList.map(p => ({
        data: p.url,
        mimeType: p.url.startsWith('data:application/pdf') ? 'application/pdf' : 'image/jpeg',
      }));

      const res = await analyzeBillPhoto(payload);
      setExtractedData(res);

      if (res.parsingStatus === 'failed') {
        setParsingError({
          reason: res.failureReason || 'Failed to detect invoice numbers, total amount, or vendor name in the uploaded photo(s).',
          suggestions: res.suggestions || [
            'Ensure the invoice or receipt is well-lit and not blurry',
            'Make sure the total amount and invoice header are visible',
            'You can still type the fields manually below'
          ]
        });
      } else {
        if (res.vendorName) setVendorName(res.vendorName);
        if (res.invoiceNumber) setInvoiceNumber(res.invoiceNumber);
        if (res.amount) setAmount(res.amount);
        if (res.dueDate) setDueDate(res.dueDate);
        if (res.billType) setBillType(res.billType as BillType);
        if (res.notes) setNotes(res.notes);
      }
    } catch (err: any) {
      console.error('Bill OCR analysis error:', err);
      let errorMsg = 'Unable to parse image(s). Please verify the document is well-lit and legible.';
      const raw = err?.message || '';
      if (raw.includes('429') || raw.includes('quota') || raw.includes('RESOURCE_EXHAUSTED')) {
        errorMsg = 'Gemini API free tier rate limit reached. Please wait a brief moment before retrying, or complete the fields manually below.';
      } else if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
        errorMsg = 'The AI OCR service is experiencing temporary high traffic. Please retry in a few seconds or enter details manually below.';
      } else if (raw.includes('format') || raw.includes('image')) {
        errorMsg = 'The image format could not be decoded. Please upload a clear JPG, PNG, or PDF.';
      } else if (raw) {
        errorMsg = raw;
      }

      setParsingError({
        reason: errorMsg,
        suggestions: [
          'Verify file format is JPG, PNG, WEBP, or PDF',
          'Ensure total file size is under 20MB',
          'Enter details manually in the form fields below'
        ]
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName || !amount) return;

    onAddBill({
      billType,
      vendorName,
      invoiceNumber: invoiceNumber || `INV-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: Number(amount),
      dueDate,
      status: 'unpaid',
      photoUrl: photos[0]?.url || undefined,
      ocrConfidence: extractedData?.confidenceScore || 0.95,
      extractedLineItems: extractedData?.lineItems,
      submittedBy: userName,
      notes,
    });

    // Reset form
    setShowUploadModal(false);
    setPhotos([]);
    setExtractedData(null);
    setParsingError(null);
    setVendorName('');
    setInvoiceNumber('');
    setAmount(0);
  };

  // Google Drive archive voucher
  const handleArchiveBillToDrive = async (bill: BillItem) => {
    try {
      setDriveUploadStatus(`Archiving ${bill.vendorName} invoice to Google Drive...`);
      const res = await uploadBillToDrive(bill);
      setDriveUploadStatus(`Archived to Google Drive: "${res.name}"`);
      setTimeout(() => setDriveUploadStatus(null), 5000);
    } catch (err: any) {
      setDriveUploadStatus(`Drive sync note: Sign in with Google to archive directly.`);
      setTimeout(() => setDriveUploadStatus(null), 5000);
    }
  };

  // Google Sheets rent roll export
  const handleExportRentRoll = async () => {
    try {
      setSheetExportStatus('Exporting rent roll to Google Sheets...');
      const res = await exportRentRollToSheets(rentPayments);
      setSheetExportStatus(`Exported to Google Sheets! View at: ${res.url}`);
      window.open(res.url, '_blank');
      setTimeout(() => setSheetExportStatus(null), 6000);
    } catch (err: any) {
      setSheetExportStatus('Google Workspace sign-in required to export to Google Sheets.');
      setTimeout(() => setSheetExportStatus(null), 5000);
    }
  };

  const totalUnpaidBills = bills
    .filter(b => b.status === 'unpaid' || b.status === 'approved_for_payment')
    .reduce((acc, b) => acc + b.amount, 0);

  const totalRentCollected = rentPayments
    .filter(p => p.status === 'paid')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalRentPending = rentPayments
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Financial Stat Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Pending Vendor Invoices</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            ${totalUnpaidBills.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {bills.filter(b => b.status !== 'paid').length} vouchers awaiting disbursement
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Rent Collected This Month</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ${totalRentCollected.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">
            Automated ACH & wire collection
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Outstanding Rent Arrears</span>
            <Clock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">
            ${totalRentPending.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Automated late notices active
          </div>
        </div>
      </div>

      {driveUploadStatus && (
        <div className="p-3 bg-indigo-900/40 border border-indigo-500/40 rounded-xl text-xs text-indigo-300 flex items-center gap-2 animate-fadeIn">
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>{driveUploadStatus}</span>
        </div>
      )}

      {sheetExportStatus && (
        <div className="p-3 bg-emerald-900/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{sheetExportStatus}</span>
        </div>
      )}

      {/* Tabs Switcher: Vendor Bills & OCR vs Rent Roll Ledger */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSubTab('bills')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'bills'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Vendor Bills & Photo Scanner</span>
          </button>

          <button
            onClick={() => setActiveSubTab('rent_roll')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'rent_roll'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Automated Rent Collection Ledger</span>
          </button>
        </div>

        {activeSubTab === 'bills' ? (
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Upload Bill / Choose Photo</span>
          </button>
        ) : (
          <button
            onClick={handleExportRentRoll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md transition"
          >
            <Download className="w-4 h-4" />
            <span>Export to Google Sheets</span>
          </button>
        )}
      </div>

      {/* TAB 1: Bills & Invoices Table with OCR and Payments */}
      {activeSubTab === 'bills' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Vendor Invoices & Scanned Receipts</h3>
              <p className="text-xs text-slate-400">
                Organized bills parsed by Gemini 3.1 Pro OCR for automatic payment routing.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">{bills.length} total entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3">Vendor / Account</th>
                  <th className="py-3 px-3">Invoice #</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {bills.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        {bill.photoUrl && (
                          <img 
                            src={bill.photoUrl} 
                            alt="thumb" 
                            className="w-7 h-7 object-cover rounded border border-slate-600 shrink-0" 
                          />
                        )}
                        <div>
                          <div>{bill.vendorName}</div>
                          {bill.ocrConfidence && (
                            <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-normal">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>OCR: {Math.round(bill.ocrConfidence * 100)}%</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">{bill.invoiceNumber}</td>
                    <td className="py-3 px-3">
                      <span className="capitalize text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                        {bill.billType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{bill.dueDate}</td>
                    <td className="py-3 px-3 font-bold text-white">
                      ${bill.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        bill.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        bill.status === 'approved_for_payment' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                        'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {bill.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {bill.status === 'unpaid' && (
                          <button
                            onClick={() => onUpdateBillStatus(bill.id, 'approved_for_payment')}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold transition"
                          >
                            Approve
                          </button>
                        )}
                        {bill.status === 'approved_for_payment' && (
                          <button
                            onClick={() => onUpdateBillStatus(bill.id, 'paid', 'ACH Direct Transfer')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition"
                          >
                            Process Payment
                          </button>
                        )}
                        <button
                          onClick={() => handleArchiveBillToDrive(bill)}
                          className="p-1 text-slate-400 hover:text-indigo-300 transition"
                          title="Archive Bill Voucher to Google Drive"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Automated Rent Collection Ledger */}
      {activeSubTab === 'rent_roll' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm">Automated Rent Roll & Tenant Payment Ledger</h3>
              <p className="text-xs text-slate-400">
                Recurring monthly charges, late fee tracking, and online tenant payment settlement.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-semibold">Period: October 2026</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-700">
                <tr>
                  <th className="py-3 px-3">Unit</th>
                  <th className="py-3 px-3">Tenant Name</th>
                  <th className="py-3 px-3">Due Date</th>
                  <th className="py-3 px-3">Monthly Rent</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Payment Details</th>
                  <th className="py-3 px-3 text-right">Lessee Portal Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {rentPayments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-700/30 transition">
                    <td className="py-3 px-3 font-bold text-white">Unit {p.unitNumber}</td>
                    <td className="py-3 px-3 text-slate-200">{p.tenantName}</td>
                    <td className="py-3 px-3 text-slate-300">{p.dueDate}</td>
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      ${p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        p.status === 'paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        p.status === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {p.referenceNumber || 'Pending settlement'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {p.status !== 'paid' ? (
                        <button
                          onClick={() => onPayRent(p.id, 'Tenant ACH Bank Debit')}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold shadow transition"
                        >
                          Pay Rent Now
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Paid ({p.paymentMethod || 'ACH'})</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bill Photo Upload & Gemini 3.1 Pro OCR Scanner Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-400" />
                <span>Photo Bill Capture & AI Organization</span>
              </h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Photo & File Selection Zone */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-5 text-center transition ${
                  isDragging ? 'border-indigo-400 bg-indigo-950/40' : 'border-slate-700 hover:border-indigo-500 bg-slate-900/50'
                }`}
              >
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                </div>

                <div className="text-xs font-semibold text-white mb-1">
                  Upload Bill from Photo Library, Files, or Camera (Up to 6 Images)
                </div>
                <p className="text-[11px] text-slate-400 mb-3.5 max-w-sm mx-auto">
                  Select multi-page invoices, receipts, and line-item schedules. Choose files from your photo library or snap new photos with your camera.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {/* Option 1: Choose from Photo Library or Files (Allows Multiple) */}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow">
                    <FolderOpen className="w-4 h-4" />
                    <span>Choose from Photo Library / Files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      className="hidden"
                    />
                  </label>

                  {/* Option 2: Live Camera Snapshot */}
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 rounded-xl text-xs font-semibold transition">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Take Photo with Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="text-[10px] text-slate-500 mt-2.5 flex items-center justify-center gap-2">
                  <span>Supports JPG, PNG, WEBP, PDF, HEIC</span>
                  <span>•</span>
                  <span className="font-semibold text-slate-400">{photos.length} / 6 images loaded</span>
                </div>
              </div>

              {isScanning && (
                <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-xl text-center text-xs text-indigo-200 flex items-center justify-center gap-2 animate-fadeIn">
                  <Sparkles className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Gemini 3.1 Pro OCR is analyzing {photos.length} page(s) and extracting invoice items...</span>
                </div>
              )}

              {/* Parsing Failure Diagnostic Box */}
              {parsingError && (
                <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-2xl text-xs space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-rose-300 font-bold">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>OCR Parsing Failed / Incomplete</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => runOcrOnPhotos(photos)}
                      className="text-[11px] text-indigo-300 hover:text-white underline font-semibold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry OCR</span>
                    </button>
                  </div>

                  <div className="text-slate-200">
                    <span className="font-semibold text-rose-200">Reason for Failure:</span> {parsingError.reason}
                  </div>

                  {parsingError.suggestions && parsingError.suggestions.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-semibold text-rose-300 block mb-1">Diagnostic Tips:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-300 text-[11px]">
                        {parsingError.suggestions.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-400 pt-1 border-t border-rose-900/60">
                    You can still edit or complete the bill details in the form fields below to store the bill.
                  </div>
                </div>
              )}

              {/* Multi-Photo Thumbnails Gallery (Up to 6 images) */}
              {photos.length > 0 && (
                <div className="space-y-2 bg-slate-900/70 p-3 rounded-2xl border border-slate-700">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">
                      Uploaded Bill Pages & Receipts ({photos.length} / 6)
                    </span>
                    {photos.length < 6 && (
                      <label className="cursor-pointer text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        <span>Add Page ({6 - photos.length} slots left)</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*,application/pdf"
                          onChange={(e) => handleFilesSelected(e.target.files)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {photos.map((p, idx) => (
                      <div key={p.id} className="relative group rounded-xl overflow-hidden border border-slate-700 aspect-square bg-slate-950">
                        <img src={p.url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                        <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.2 rounded">
                          Page {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-full p-1 opacity-90 transition shadow"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {extractedData && !parsingError && (
                    <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Parsed successfully from {photos.length} image(s) with {Math.round((extractedData.confidenceScore || 0.95) * 100)}% OCR confidence.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Editable Form */}
              <form onSubmit={handleSaveBill} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Vendor / Biller *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., ConEdison City Power"
                      value={vendorName}
                      onChange={e => setVendorName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Invoice Number</label>
                    <input
                      type="text"
                      placeholder="e.g., INV-99382"
                      value={invoiceNumber}
                      onChange={e => setInvoiceNumber(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Total Amount ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={amount || ''}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Bill Category</label>
                    <select
                      value={billType}
                      onChange={e => setBillType(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-white outline-none"
                    >
                      <option value="contractor_invoice">Contractor Invoice</option>
                      <option value="utility">Utility (Water / Gas / Electric)</option>
                      <option value="property_tax">Property Tax</option>
                      <option value="maintenance_receipt">Maintenance Receipt</option>
                      <option value="insurance">Insurance Premium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Notes & Line Item Summary</label>
                  <textarea
                    rows={2}
                    placeholder="Details extracted from bill..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
                  >
                    Save & Organize Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
