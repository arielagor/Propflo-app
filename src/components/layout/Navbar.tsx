import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserCheck, 
  ShieldCheck, 
  Sparkles, 
  Bell, 
  CheckCircle2, 
  LogOut, 
  RefreshCw,
  FolderSync,
  Layers,
  PhoneCall
} from 'lucide-react';
import { UserRole, UserProfile } from '../../types';
import { googleSignIn, logout, initAuth } from '../../firebase/config';
import { User } from 'firebase/auth';

interface NavbarProps {
  currentUser: UserProfile;
  onRoleChange: (role: UserRole) => void;
  activeNotification: string | null;
  onOpenVoiceModal?: () => void;
  onOpenWorkspaceModal?: () => void;
}

const ROLE_OPTIONS: Array<{ role: UserRole; label: string; badge: string; description: string }> = [
  { 
    role: 'property_manager', 
    label: 'Property Manager', 
    badge: 'PM / Operations', 
    description: 'Full approval control, dispatching & lease administration' 
  },
  { 
    role: 'lessee', 
    label: 'Lessee / Tenant', 
    badge: 'Tenant Portal', 
    description: 'Voice maintenance requests, rent payment, e-signatures' 
  },
  { 
    role: 'finance_officer', 
    label: 'Finance Officer', 
    badge: 'Accounting', 
    description: 'Bill review, rent collection ledger, vendor payments' 
  },
  { 
    role: 'vendor_coordinator', 
    label: 'Vendor Coordinator', 
    badge: 'Field Dispatch', 
    description: 'Contractor triage, on-site maintenance dispatch' 
  },
  { 
    role: 'legal_admin', 
    label: 'Legal Counsel', 
    badge: 'Compliance', 
    description: 'Lease addendums, regulatory review, dispute waivers' 
  },
  { 
    role: 'executive', 
    label: 'Executive Director', 
    badge: 'Executive Oversight', 
    description: 'High-level bottlenecks, budget approvals & productivity analytics' 
  },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onRoleChange,
  activeNotification,
  onOpenVoiceModal,
  onOpenWorkspaceModal,
}) => {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setAuthUser(user);
      },
      () => {
        setAuthUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await googleSignIn();
    } catch (err) {
      console.error('Google Sign-in failed', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setAuthUser(null);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      {activeNotification && (
        <div className="bg-emerald-600 px-4 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-2 text-white animate-fadeIn">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{activeNotification}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/40">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                PropFlow Enterprise
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Real Estate Bureaucracy OS
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Streamlined Approvals • Voice Maintenance • Automated Billing • Lease E-Sign
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Quick Voice Line for Lessee */}
          {onOpenVoiceModal && (
            <button
              onClick={onOpenVoiceModal}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition"
              title="Real-time Voice Hotline for Maintenance Requests"
            >
              <PhoneCall className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Lessee Voice Intake</span>
            </button>
          )}

          {/* Google Workspace status button */}
          {onOpenWorkspaceModal && (
            <button
              onClick={onOpenWorkspaceModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium transition"
              title="Google Workspace Services (Drive, Sheets, Calendar, Gmail, Tasks)"
            >
              <FolderSync className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Workspace Hub</span>
              {authUser && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>}
            </button>
          )}

          {/* Role Switcher (RBAC) */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline text-slate-400">Role:</span>
              <span className="font-semibold text-white">
                {ROLE_OPTIONS.find(r => r.role === currentUser.role)?.label}
              </span>
              <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/50">
                {currentUser.unit}
              </span>
            </button>

            {roleMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn"
                onMouseLeave={() => setRoleMenuOpen(false)}
              >
                <div className="px-3 py-1.5 border-b border-slate-700 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Select Active Personnel Role
                </div>
                {ROLE_OPTIONS.map((item) => (
                  <button
                    key={item.role}
                    onClick={() => {
                      onRoleChange(item.role);
                      setRoleMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-slate-700/70 transition ${
                      currentUser.role === item.role ? 'bg-indigo-900/40 border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{item.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{item.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Google Sign-in with official styling */}
          {!authUser ? (
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-slate-800 py-1 px-2.5 rounded-lg border border-slate-700">
                {authUser.photoURL ? (
                  <img 
                    src={authUser.photoURL} 
                    alt="avatar" 
                    className="w-5 h-5 rounded-full border border-indigo-400" 
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {authUser.displayName ? authUser.displayName[0] : 'U'}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-[11px] font-semibold text-slate-200 leading-tight">
                    {authUser.displayName || 'Authorized'}
                  </div>
                  <div className="text-[9px] text-emerald-400">Workspace Connected</div>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
