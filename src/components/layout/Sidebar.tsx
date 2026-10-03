import React from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  Receipt, 
  FileSignature, 
  BarChart3, 
  Sparkles, 
  FolderSync,
  AlertCircle
} from 'lucide-react';
import { UserRole } from '../../types';

export type NavTab = 
  | 'dashboard' 
  | 'maintenance' 
  | 'billing' 
  | 'leases' 
  | 'analytics' 
  | 'ai_concierge'
  | 'workspace';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  userRole: UserRole;
  counts: {
    pendingApprovals: number;
    activeMaintenance: number;
    unpaidBills: number;
    pendingLeases: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  userRole,
  counts,
}) => {
  const tabs = [
    {
      id: 'dashboard' as NavTab,
      label: 'Workflow Approvals',
      subtitle: 'Bottlenecks & Feedback',
      icon: LayoutDashboard,
      badge: counts.pendingApprovals > 0 ? counts.pendingApprovals : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'maintenance' as NavTab,
      label: 'Maintenance & Voice',
      subtitle: userRole === 'lessee' ? 'Tenant Voice Hotline' : 'Voice Dispatch & Triage',
      icon: Wrench,
      badge: counts.activeMaintenance > 0 ? counts.activeMaintenance : undefined,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'billing' as NavTab,
      label: 'Bills & Rent Ledger',
      subtitle: 'Photo Scanner & Pay',
      icon: Receipt,
      badge: counts.unpaidBills > 0 ? counts.unpaidBills : undefined,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'leases' as NavTab,
      label: 'Leases & E-Signature',
      subtitle: 'Digital Vault & Drive',
      icon: FileSignature,
      badge: counts.pendingLeases > 0 ? counts.pendingLeases : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'analytics' as NavTab,
      label: 'Productivity & SLA',
      subtitle: 'Bottleneck Analytics',
      icon: BarChart3,
    },
    {
      id: 'ai_concierge' as NavTab,
      label: 'PropFlow AI Intelligence',
      subtitle: 'Chat, Visuals & Grounding',
      icon: Sparkles,
      highlight: true,
    },
    {
      id: 'workspace' as NavTab,
      label: 'Google Workspace',
      subtitle: 'Drive, Sheets, Cal, Mail',
      icon: FolderSync,
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-3 space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold shadow-md shadow-indigo-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              } ${tab.highlight && !isActive ? 'border border-indigo-500/30 bg-indigo-950/20' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : tab.highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
                <div>
                  <div className="text-xs leading-snug">{tab.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {tab.subtitle}
                  </div>
                </div>
              </div>
              {tab.badge !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${isActive ? 'bg-white/20 text-white border-white/30' : tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Role Status Card */}
      <div className="mt-auto p-4 border-t border-slate-800/80 bg-slate-900/50">
        <div className="bg-slate-800/70 rounded-xl p-3 border border-slate-700/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Operating Role</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <div className="text-xs font-bold text-slate-100 uppercase tracking-wide">
            {userRole.replace('_', ' ')}
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {userRole === 'lessee' 
              ? 'You are viewing tenant self-service tools for rent, maintenance and lease agreements.' 
              : 'Enterprise bureaucracy controls and inter-departmental approvals are enabled.'}
          </p>
        </div>
      </div>
    </aside>
  );
};
