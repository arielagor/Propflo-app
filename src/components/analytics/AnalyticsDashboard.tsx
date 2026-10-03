import React from 'react';
import { ProductivityMetric } from '../../types';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Users, 
  Zap,
  Layers,
  ArrowUpRight
} from 'lucide-react';

interface AnalyticsDashboardProps {
  metrics: ProductivityMetric[];
  pendingApprovalsCount: number;
  totalMaintenanceCount: number;
  totalLeasesCount: number;
  totalBillsCount: number;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  metrics,
  pendingApprovalsCount,
  totalMaintenanceCount,
  totalLeasesCount,
  totalBillsCount,
}) => {
  const avgSla = Math.round(
    metrics.reduce((acc, m) => acc + m.slaComplianceRate, 0) / metrics.length
  );

  const totalProcessed = metrics.reduce((acc, m) => acc + m.tasksProcessed, 0);

  return (
    <div className="space-y-6">
      {/* Top Level Efficiency KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Overall SLA Compliance</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{avgSla}%</div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Target: &gt;90% across all depts</span>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Workflow Tasks Processed</span>
            <Zap className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalProcessed}</div>
          <div className="text-[11px] text-indigo-300 mt-1">
            Across 5 functional departments
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Active Approvals Queue</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{pendingApprovalsCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Average turnaround: 11.2 hours
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Maintenance Volume</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400">{totalMaintenanceCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Voice triage average: 4.2 hours
          </div>
        </div>
      </div>

      {/* Department Productivity & SLA Breakdown Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <span>Inter-Departmental Productivity & Bottleneck Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cycle times, bottleneck hours, and operational efficiency metrics per operating unit.
            </p>
          </div>
          <span className="text-xs bg-slate-900 border border-slate-700 px-3 py-1 rounded-lg text-slate-300 font-semibold">
            Realtime SLA Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Department Unit</th>
                <th className="py-3 px-4">Avg Resolution Cycle</th>
                <th className="py-3 px-4">SLA Compliance</th>
                <th className="py-3 px-4">Workload Bar</th>
                <th className="py-3 px-4">Active Bottlenecks</th>
                <th className="py-3 px-4 text-right">Tasks Processed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60">
              {metrics.map(m => (
                <tr key={m.department} className="hover:bg-slate-700/30 transition">
                  <td className="py-3.5 px-4 font-bold text-white capitalize flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      m.department === 'leasing' ? 'bg-blue-400' :
                      m.department === 'maintenance' ? 'bg-orange-400' :
                      m.department === 'finance' ? 'bg-emerald-400' :
                      m.department === 'legal' ? 'bg-purple-400' : 'bg-indigo-400'
                    }`}></span>
                    <span>{m.department}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">
                    <strong>{m.avgResolutionHours} hrs</strong>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      m.slaComplianceRate >= 90 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      m.slaComplianceRate >= 80 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {m.slaComplianceRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 min-w-[140px]">
                    <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-700">
                      <div 
                        className={`h-full rounded-full ${
                          m.slaComplianceRate >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, (m.tasksProcessed / 70) * 100)}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {m.activeBottlenecks > 0 ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{m.activeBottlenecks} flagged</span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Zero bottlenecks</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-white">
                    {m.tasksProcessed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Efficiency Insights & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Bureaucracy Optimization Insights</span>
            </h4>
            <span className="text-[10px] text-indigo-400 font-semibold uppercase">AI Recommendation</span>
          </div>
          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
              <strong className="text-white block mb-0.5">Finance Department Bottleneck:</strong>
              Average review cycle for vendor invoices is currently 19.4 hours. Enabling auto-approval for pre-contracted emergency repairs under $1,000 will cut dispatch cycle time by 45%.
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
              <strong className="text-white block mb-0.5">Legal Addendum Standardization:</strong>
              Concession clause reviews account for 26.0h turnaround. Introducing standard pre-vetted free-rent clauses eliminates manual legal routing.
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span>Real Estate Operational Footprint</span>
            </h4>
            <span className="text-[10px] text-slate-400">Portfolio Status</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Active Leases</span>
              <span className="text-xl font-bold text-white mt-1 block">{totalLeasesCount}</span>
              <span className="text-[10px] text-emerald-400">100% E-Sign audit trail</span>
            </div>
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
              <span className="text-slate-400 block text-[11px]">Total Bills Managed</span>
              <span className="text-xl font-bold text-white mt-1 block">{totalBillsCount}</span>
              <span className="text-[10px] text-indigo-300">OCR & Google Drive sync</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
