import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ShieldAlert, Cpu, Database, Lock, AlertTriangle, UserCheck, Plus, Trash2, Building } from 'lucide-react';

// =========================================================================
// 1. INLINE BACKGROUND MATRIX CANVAS COMPONENT
// =========================================================================
function InlineMatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const glyphs = "0123456789ABCDEF//X_ROOT_ALERT_SYSTEM_CRITICAL_MOCK_DATA_HANDSHAKE_01".split("");
    const fontSize = 13;
    const columns = Math.floor(window.innerWidth / fontSize) + 1;
    const dropPositions = Array(columns).fill(1).map(() => Math.floor(Math.random() * -50));

    const renderMatrixRain = () => {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.14)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      ctx.fillStyle = '#00FF41';
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00FF41';
      ctx.font = `bold ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;

      for (let i = 0; i < dropPositions.length; i++) {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        const x = i * fontSize;
        const y = dropPositions[i] * fontSize;

        ctx.fillText(char, x, y);

        if (y > window.innerHeight && Math.random() > 0.975) {
          dropPositions[i] = 0;
        }
        dropPositions[i]++;
      }
    };

    const interval = setInterval(renderMatrixRain, 35);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-55 bg-[#030305]" 
    />
  );
}

// =========================================================================
// 2. MAIN SUPERADMIN DASHBOARD ENTITY (WITH HIGH VISIBILITY MATRIX COLORS)
// =========================================================================
const INITIAL_COMPANIES = [
  { id: 'comp-1', name: 'Acme Corp', sector: 'Enterprise SaaS', adminsCount: 2 },
  { id: 'comp-2', name: 'Initech Labs', sector: 'Cybersecurity', adminsCount: 1 },
  { id: 'comp-3', name: 'Umbrella Corp', sector: 'BioTech Automation', adminsCount: 3 }
];

const INITIAL_ADMINS = [
  { id: 'adm-101', name: 'Rafiq Islam', email: 'rafiq@acme.com', companyId: 'comp-1', companyName: 'Acme Corp', level: 'Root Admin', status: 'ACTIVE' },
  { id: 'adm-102', name: 'Zafar Iqbal', email: 'zafar@ini-tech.io', companyId: 'comp-2', companyName: 'Initech Labs', level: 'SysOp Admin', status: 'ACTIVE' },
  { id: 'adm-103', name: 'Anis Rahman', email: 'anis@umbrella.org', companyId: 'comp-3', companyName: 'Umbrella Corp', level: 'Data Admin', status: 'SUSPENDED' }
];

const INITIAL_SYSTEM_LOGS = [
  { id: 'LOG_8943', node: 'NODE_ALPHA', event: 'ADMIN_PROVISION_SUCCESS', operator: 'SUPER_ROOT', timestamp: '2026-07-18 16:45:12' },
  { id: 'LOG_8944', node: 'NODE_SECURE', event: 'TICKET_DB_SYNC_COMPLETE', operator: 'SYS_DAEMON', timestamp: '2026-07-18 17:02:44' },
  { id: 'LOG_8945', node: 'NODE_BRAVO', event: 'AUTH_TOKEN_ROTATION', operator: 'CRON_JOB', timestamp: '2026-07-18 17:55:01' }
];

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState(INITIAL_COMPANIES);
  const [admins, setAdmins] = useState(INITIAL_ADMINS);
  const [systemLogs, setSystemLogs] = useState(INITIAL_SYSTEM_LOGS);
  const [activeSection, setActiveSection] = useState('dashboard');
  
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', companyId: 'comp-1', level: 'SysOp Admin' });
  const [newCompany, setNewCompany] = useState({ name: '', sector: '' });

  const handleCreateCompany = (e) => {
    e.preventDefault();
    if (!newCompany.name.trim() || !newCompany.sector.trim()) return;

    const generatedCompany = {
      id: `comp-${Date.now().toString().slice(-3)}`,
      name: newCompany.name.trim(),
      sector: newCompany.sector.trim(),
      adminsCount: 0
    };

    setCompanies(prev => [...prev, generatedCompany]);
    setSystemLogs(prev => [
      {
        id: `LOG_${Math.floor(1000 + Math.random() * 9000)}`,
        node: 'NODE_COMPANY_PROVISION',
        event: `NEW_COMPANY_BOUND: ${generatedCompany.id} (${generatedCompany.name})`,
        operator: 'SUPER_ROOT',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      },
      ...prev
    ]);
    setNewCompany({ name: '', sector: '' });
  };

  const handleDeleteCompany = (companyId, companyName) => {
    const doubleCheck = confirm(`⚠️ WARNING: DELETING COMPANY NODE "${companyName.toUpperCase()}" WILL REMOVE ALL SYSTEM BINDINGS! CONTINUE?`);
    if (!doubleCheck) return;

    const secureConfirm = prompt(`TYPE "${companyId}" TO CONFIRM DE-PROVISION PROTOCOL:`);
    if (secureConfirm !== companyId) {
      alert("ABORTED: Verification fingerprint string mismatch.");
      return;
    }

    setCompanies(prev => prev.filter(c => c.id !== companyId));
    setAdmins(prev => prev.filter(a => a.companyId !== companyId));
    setSystemLogs(prev => [
      {
        id: `LOG_${Math.floor(1000 + Math.random() * 9000)}`,
        node: 'NODE_COMPANY_PURGE',
        event: `COMPANY_DESTROYED_NODE: ${companyId}`,
        operator: 'SUPER_ROOT',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      },
      ...prev
    ]);
  };

  const handleCreateAdmin = (e) => {
    e.preventDefault();
    if (!newAdmin.name.trim() || !newAdmin.email.trim()) return;

    const targetCompany = companies.find(c => c.id === newAdmin.companyId);
    const generatedAdmin = {
      id: `adm-${Date.now().toString().slice(-3)}`,
      name: newAdmin.name.trim(),
      email: newAdmin.email.trim(),
      companyId: newAdmin.companyId,
      companyName: targetCompany ? targetCompany.name : 'Unknown Corp',
      level: newAdmin.level,
      status: 'ACTIVE'
    };

    setAdmins(prev => [generatedAdmin, ...prev]);
    setCompanies(prev => prev.map(c => c.id === newAdmin.companyId ? { ...c, adminsCount: c.adminsCount + 1 } : c));
    setSystemLogs(prev => [
      {
        id: `LOG_${Math.floor(1000 + Math.random() * 9000)}`,
        node: 'NODE_ROOT_PROVISION',
        event: `NEW_ADMIN_TRANSMITTED: ${generatedAdmin.id}`,
        operator: 'SUPER_ROOT',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      },
      ...prev
    ]);
    setNewAdmin({ name: '', email: '', companyId: companies[0]?.id || 'comp-1', level: 'SysOp Admin' });
  };

  const handleDeleteAdmin = (adminId, companyId) => {
    if (!confirm(`CRITICAL: INITIATE DE-PROVISION FOR NODE ${adminId}?`)) return;
    setAdmins(prev => prev.filter(a => a.id !== adminId));
    setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, adminsCount: Math.max(0, c.adminsCount - 1) } : c));
    setSystemLogs(prev => [
      {
        id: `LOG_${Math.floor(1000 + Math.random() * 9000)}`,
        node: 'NODE_ROOT_REVOKE',
        event: `ADMIN_DELETED_NODE: ${adminId}`,
        operator: 'SUPER_ROOT',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
      },
      ...prev
    ]);
  };

  const navTabs = [
    { id: 'dashboard', label: 'System Summary', icon: Terminal, color: 'text-[#00FF41]', border: 'border-[#00FF41]/30' },
    { id: 'companies', label: 'Registered Companies', icon: Building, color: 'text-[#00FF41]', border: 'border-[#00FF41]/30' },
    { id: 'admins', label: 'Provisioned Admins', icon: Lock, color: 'text-[#00FF41]', border: 'border-[#00FF41]/30' },
    { id: 'logs', label: 'Global Audit Logs', icon: UserCheck, color: 'text-[#00FF41]', border: 'border-[#00FF41]/30' }
  ];

  return (
    <div className="relative min-h-screen bg-[#040406] overflow-x-hidden">
      
      {/* Background Underlay */}
      <InlineMatrixRain />

      {/* Main Container View Interface */}
      <div className="relative z-10 min-h-screen text-[#E0FAEC] p-4 md:p-8 font-mono selection:bg-[#00FF41] selection:text-black">
        
        {/* Terminal Header Shell */}
        <header className="mb-8 p-5 bg-black/60 backdrop-blur-md border border-[#00FF41]/30 border-l-4 border-l-[#00FF41] rounded-r-xl shadow-[0_0_30px_rgba(0,255,65,0.05)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] text-[#00FF41] font-black uppercase tracking-[0.3em] drop-shadow-[0_0_4px_rgba(0,255,65,0.4)]">
              <ShieldAlert size={14} className="animate-pulse" /> NETWORK_ROOT_ACCESS: STATUS_AUTHORIZED
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter">
              SUPER_NODE: <span className="text-[#00FF41] drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]">SUPER_ADMIN_ROOT</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-emerald-500/60">
              <span className="bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]/40 px-2.5 py-0.5 rounded font-black">
                SECTOR: GLOBAL_CORE
              </span>
              <span>// PIPELINE_v4.2</span>
              <span className="text-[#00FF41] font-extrabold drop-shadow-[0_0_3px_rgba(0,255,65,0.3)]">// MONITOR: ONLINE</span>
            </div>
          </div>
          <div className="hidden md:block text-right">
            <div className="text-[10px] text-emerald-500/40 uppercase font-black mb-0.5 tracking-wider">Cluster_Sync</div>
            <div className="text-lg font-black text-[#00FF41] flex items-center gap-1.5 justify-end drop-shadow-[0_0_5px_rgba(0,255,65,0.4)]">
              <Cpu size={16} /> 14.2% NOMINAL
            </div>
          </div>
        </header>

        {/* Dynamic Glowing Navigation Bar */}
        <nav className="flex gap-2.5 mb-8 overflow-x-auto pb-2 border-b border-[#00FF41]/20">
          {navTabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeSection === tab.id 
                  ? 'bg-[#00FF41] text-black border-[#00FF41] shadow-[0_0_25px_rgba(0,255,65,0.5)] font-black'
                  : 'bg-black/60 backdrop-blur-xs text-[#00FF41] border-[#00FF41]/30 hover:bg-[#00FF41]/15 hover:border-[#00FF41] hover:shadow-[0_0_15px_rgba(0,255,65,0.2)] cursor-pointer'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Window Render Layout */}
      <main className="animate-in fade-in duration-300">
        {activeSection === 'dashboard' ? (
          <div className="space-y-6">
            
            {/* Summary Metric Display Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {navTabs.slice(1).map((card) => {
                let currentMetric = '0';
                if (card.id === 'companies') currentMetric = companies.length;
                if (card.id === 'admins') currentMetric = admins.length;
                if (card.id === 'logs') currentMetric = systemLogs.length;

                return (
                  <div 
                    key={card.id} 
                    onClick={() => setActiveSection(card.id)}
                    className="p-6 bg-black/60 backdrop-blur-md border border-[#00FF41]/30 hover:border-[#00FF41] hover:shadow-[0_0_20px_rgba(0,255,65,0.15)] rounded-xl cursor-pointer transition-all hover:scale-101 shadow-md group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <card.icon className="text-[#00FF41] h-6 w-6 group-hover:scale-110 transition-transform drop-shadow-[0_0_5px_rgba(0,255,65,0.4)]" />
                      <span className="text-2xl font-black text-white drop-shadow-[0_0_8px_rgba(0,255,65,0.3)]">
                        {currentMetric.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">{card.label}</h3>
                    <p className="text-emerald-500/50 text-[11px] leading-tight font-medium">Click to execute telemetry sub-matrix protocols inside node {card.id.toUpperCase()}.</p>
                  </div>
                );
              })}
            </div>

            {/* Glowing System Logs Stream Drawer */}
            <div className="bg-black/70 backdrop-blur-md border border-[#00FF41]/30 rounded-xl p-4 shadow-2xl">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-500/40 mb-2 border-b border-[#00FF41]/20 pb-2">
                <Terminal size={12} className="text-[#00FF41]" /> Live_System_Audit_Stream
              </div>
              <div className="space-y-1 font-mono text-[11px] text-[#00FF41] max-h-56 overflow-y-auto pr-1 drop-shadow-[0_0_5px_rgba(0,255,65,0.7)]">
                <div>[SYSTEM] Initialize Kernel Handshake Protocol... SECURE</div>
                <div>[CLUSTER] Core mainframe cluster nodes operational.</div>
                {systemLogs.map((l, idx) => (
                  <div key={idx} className="opacity-100 font-bold">
                    [{l.timestamp}] [{l.node}] {l.event} (AUTH_KEY: {l.operator})
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Input Form Box: Companies Section */}
            {activeSection === 'companies' && (
              <div className="bg-black/60 backdrop-blur-md border border-[#00FF41]/40 rounded-xl p-5 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4 border-b border-[#00FF41]/20 pb-2.5">
                  <Building size={16} className="text-[#00FF41]" /> Initialize Corporate Tenant Node
                </h3>
                <form onSubmit={handleCreateCompany} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-500/60 uppercase mb-1">Company Corporate Name</label>
                    <input type="text" required placeholder="e.g. Cyberdyne Systems" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} className="w-full bg-black/80 border border-[#00FF41]/30 focus:border-[#00FF41] rounded p-2 text-xs text-white outline-none font-mono focus:ring-1 focus:ring-[#00FF41]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-500/60 uppercase mb-1">Operational Sector</label>
                    <input type="text" required placeholder="e.g. Artificial Intelligence" value={newCompany.sector} onChange={(e) => setNewCompany({ ...newCompany, sector: e.target.value })} className="w-full bg-black/80 border border-[#00FF41]/30 focus:border-[#00FF41] rounded p-2 text-xs text-white outline-none font-mono focus:ring-1 focus:ring-[#00FF41]" />
                  </div>
                  <button type="submit" className="w-full bg-transparent border-2 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black py-2 rounded text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(0,255,65,0.2)] hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] cursor-pointer active:scale-98">DEPLOY_COMPANY_NODE</button>
                </form>
              </div>
            )}

            {/* Input Form Box: Admins Section */}
            {activeSection === 'admins' && (
              <div className="bg-black/60 backdrop-blur-md border border-[#00FF41]/40 rounded-xl p-5 shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 mb-4 border-b border-[#00FF41]/20 pb-2.5">
                  <Plus size={16} className="text-[#00FF41]" /> Assign & Provision Company Admin Node
                </h3>
                <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-500/60 uppercase mb-1">Admin Full Name</label>
                    <input type="text" required placeholder="e.g. Rafiq Ahmed" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} className="w-full bg-black/80 border border-[#00FF41]/30 focus:border-[#00FF41] rounded p-2 text-xs text-white outline-none font-mono focus:ring-1 focus:ring-[#00FF41]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-500/60 uppercase mb-1">Security Email Key</label>
                    <input type="email" required placeholder="admin@company.com" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} className="w-full bg-black/80 border border-[#00FF41]/30 focus:border-[#00FF41] rounded p-2 text-xs text-white outline-none font-mono focus:ring-1 focus:ring-[#00FF41]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-500/60 uppercase mb-1">Company Binding Option</label>
                    <select value={newAdmin.companyId} onChange={(e) => setNewAdmin({ ...newAdmin, companyId: e.target.value })} className="w-full bg-black/80 border border-[#00FF41]/30 focus:border-[#00FF41] rounded p-2 text-xs text-white outline-none font-mono focus:ring-1 focus:ring-[#00FF41]">
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-transparent border-2 border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black py-2 rounded text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(0,255,65,0.2)] hover:shadow-[0_0_20px_rgba(0,255,65,0.4)] cursor-pointer active:scale-98">DEPLOY_ADMIN_NODE</button>
                </form>
              </div>
            )}

            {/* Matrix Operational Database High-Visibility Grid Sheet */}
            <div className="bg-black/60 backdrop-blur-md rounded-xl border border-[#00FF41]/30 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-black/80 text-[#00FF41] text-[10px] uppercase font-black tracking-widest border-b border-[#00FF41]/30 select-none drop-shadow-[0_0_3px_rgba(0,255,65,0.4)]">
                  <tr>
                    {activeSection === 'companies' && <>
                      <th className="p-4">Company_UUID</th><th className="p-4">Corporate_Name</th><th className="p-4">Operational_Sector</th><th className="p-4">Linked_Admins</th><th className="p-4 text-right">Destruct_Protocol</th>
                    </>}
                    {activeSection === 'admins' && <>
                      <th className="p-4">Admin_ID</th><th className="p-4">Operator_Name</th><th className="p-4">Security_Email_Hash</th><th className="p-4">Company_Binding</th><th className="p-4">Access_Clearance</th><th className="p-4 text-right">Action_Protocol</th>
                    </>}
                    {activeSection === 'logs' && <>
                      <th className="p-4">Log_Ref</th><th className="p-4">Target_Node</th><th className="p-4">System_Event_Header</th><th className="p-4">Authorized_Operator</th><th className="p-4 text-right">Logged_Timestamp</th>
                    </>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#00FF41]/10 text-xs font-mono font-bold text-[#E0FAEC]">
                  
                  {activeSection === 'companies' && companies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-[#00FF41]/10 transition-colors">
                      <td className="p-4 text-[#00FF41] drop-shadow-[0_0_2px_rgba(0,255,65,0.3)]">#{comp.id.toUpperCase()}</td>
                      <td className="p-4 text-white font-black">{comp.name}</td>
                      <td className="p-4 text-emerald-400/70 italic">"{comp.sector}"</td>
                      <td className="p-4 font-black text-[#00FF41] drop-shadow-[0_0_3px_rgba(0,255,65,0.4)] tracking-widest">[{comp.adminsCount.toString().padStart(2, '0')}]</td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteCompany(comp.id, comp.name)} className="text-red-400 hover:text-red-500 p-1.5 rounded hover:bg-red-950/40 transition-all cursor-pointer"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}

                  {activeSection === 'admins' && admins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-[#00FF41]/10 transition-colors">
                      <td className="p-4 text-emerald-400">{admin.id}</td>
                      <td className="p-4 text-white font-black">{admin.name}</td>
                      <td className="p-4 text-emerald-500/80 font-mono select-all">{admin.email}</td>
                      <td className="p-4 text-slate-300">{admin.companyName}</td>
                      <td className="p-4"><span className="text-[10px] bg-[#00FF41]/10 border border-[#00FF41]/40 text-[#00FF41] px-2 py-0.5 rounded font-black uppercase tracking-wider">{admin.level}</span></td>
                      <td className="p-4 text-right">
                        <button onClick={() => handleDeleteAdmin(admin.id, admin.companyId)} className="text-red-400 hover:text-red-500 p-1.5 rounded hover:bg-red-950/40 transition-all cursor-pointer"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}

                  {activeSection === 'logs' && systemLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#00FF41]/10 transition-colors">
                      <td className="p-4 text-[#00FF41]">{log.id}</td>
                      <td className="p-4 text-emerald-500/60 font-black">{log.node}</td>
                      <td className="p-4 text-white tracking-tight">`{log.event}`</td>
                      <td className="p-4 text-slate-200">{log.operator}</td>
                      <td className="p-4 text-right text-[10px] text-emerald-500/40 font-sans font-medium">{log.timestamp}</td>
                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
    </div>
  );
}