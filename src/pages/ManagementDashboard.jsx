import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Users, 
  Home, 
  Clock, 
  CheckCircle2, 
  Wrench, 
  ArrowRight,
  ChevronRight,
  DollarSign,
  Briefcase,
  Image as ImageIcon,
  ExternalLink,
  LogOut,
  X,
  Info,
  ShieldCheck,
  Tag,
  Layers,
  Activity
} from 'lucide-react';

const ManagementDashboard = ({ 
  roomStates = {}, 
  maintenanceLogs = [], 
  properties = [],
  onNavigate,
  onSearch
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerFilter, setDrawerFilter] = useState('all');
  const [selectedRoomDetail, setSelectedRoomDetail] = useState(null);

  // 1. Integrated Stats (Available vs Occupied)
  const stats = useMemo(() => {
    const rooms = Object.values(roomStates || {});
    
    return {
      totalUnits: rooms.length || 0,
      available: rooms.filter(r => r?.status === 'ready').length || 0,
      occupied: rooms.filter(r => r?.status === 'rented').length || 0,
      pending: rooms.filter(r => ['appointment', 'booked'].includes(r?.status)).length || 0
    };
  }, [roomStates]);

  // 2. Priority Tasks: Repair Jobs & Move-out Notifications
  const priorityTasks = useMemo(() => {
    let tasks = [];
    
    Object.entries(roomStates || {}).forEach(([id, r]) => {
      // Repair Jobs
      if (r?.status === 'maintenance') {
        tasks.push({
          id,
          roomNo: id.split('_')[1],
          propertyId: r.propertyId,
          type: 'repair',
          label: 'Repair Job',
          status: 'Waiting for repair',
          icon: Wrench,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          updatedAt: r.managementUpdatedAt || r.lastUpdateTime || '',
          data: r
        });
      }
      // Move-out Notifications
      if (['checkingOut', 'keyReturn'].includes(r?.status)) {
        tasks.push({
          id,
          roomNo: id.split('_')[1],
          propertyId: r.propertyId,
          type: 'moveout',
          label: 'Move-out',
          status: r.status === 'checkingOut' ? 'Notice Given' : 'Key Return Pending',
          icon: LogOut,
          color: 'text-rose-400',
          bg: 'bg-rose-400/10',
          updatedAt: r.managementUpdatedAt || r.lastUpdateTime || '',
          data: r
        });
      }
    });

    return tasks
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 8);
  }, [roomStates]);

  // 3. Filtered Rooms for Drawer
  const filteredRooms = useMemo(() => {
    if (!drawerOpen) return [];
    return Object.entries(roomStates || {})
      .filter(([id, r]) => {
        if (drawerFilter === 'all') return true;
        if (drawerFilter === 'ready') return r?.status === 'ready';
        if (drawerFilter === 'rented') return r?.status === 'rented';
        if (drawerFilter === 'pending') return ['appointment', 'booked'].includes(r?.status);
        return true;
      })
      .map(([id, r]) => ({ id, roomNo: id.split('_')[1], ...r }));
  }, [roomStates, drawerOpen, drawerFilter]);

  const getStatusLabel = (status) => {
    const labels = {
      ready: 'พร้อมขาย',
      appointment: 'นัดดูห้อง',
      booked: 'จองแล้ว',
      rented: 'มีผู้เช่า',
      checkingOut: 'แจ้งย้ายออก',
      keyReturn: 'คืนกุญแจ',
      maintenance: 'รอซ่อม',
      cleaningPre: 'ทำความสะอาดก่อนซ่อม',
      cleaningPost: 'ทำความสะอาดหลังซ่อม',
      finalQC: 'ตรวจ QC'
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    if (status === 'ready') return 'text-emerald-400';
    if (status === 'rented') return 'text-indigo-400';
    if (['appointment', 'booked'].includes(status)) return 'text-amber-400';
    if (['checkingOut', 'keyReturn'].includes(status)) return 'text-rose-400';
    return 'text-slate-400';
  };

  const getPropertyName = (id) => {
    return properties.find(p => p.id === id)?.name || id;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 md:p-8 lg:p-10 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-8 md:space-y-12">
        
        {/* Header - Re-centered for balance */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="space-y-1">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white flex items-center justify-center gap-4">
              <LayoutDashboard className="text-indigo-400" size={48} />
              ApartCloud
            </h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] md:text-xs">Command Center • Property Portfolio Management</p>
          </div>
        </div>

        {/* Integrated Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', filter: 'ready' },
            { label: 'Occupied', value: stats.occupied, icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-400/10', filter: 'rented' },
            { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10', filter: 'pending' },
            { label: 'Total Units', value: stats.totalUnits, icon: Home, color: 'text-blue-400', bg: 'bg-blue-400/10', filter: 'all' }
          ].map((item) => (
            <button 
              key={item.label}
              onClick={() => { setDrawerFilter(item.filter); setDrawerOpen(true); }}
              className="bg-slate-900/60 border border-white/5 p-5 md:p-8 rounded-[2rem] md:rounded-[3rem] text-left hover:bg-slate-800/80 transition-all hover:scale-[1.03] group relative overflow-hidden shadow-2xl"
            >
              <div className={`${item.bg} w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-6`}>
                <item.icon className={item.color} size={24} />
              </div>
              <p className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-widest">{item.label}</p>
              <p className="text-2xl md:text-4xl font-black text-white mt-1">{item.value.toLocaleString()}</p>
              <ArrowRight className="absolute right-6 bottom-6 md:right-8 md:bottom-8 text-slate-800 group-hover:text-white transition-colors" size={20} />
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
          
          {/* Priority Task List (Repair Jobs & Move-outs) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/60 border border-white/5 rounded-[3rem] p-6 md:p-10 shadow-2xl h-full">
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-4">
                  <Briefcase className="text-indigo-400" size={28} />
                  Priority Repairs
                </h2>
                <div className="bg-rose-500/20 text-rose-400 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-rose-500/20">
                  {priorityTasks.length} Urgent
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {priorityTasks.length > 0 ? priorityTasks.map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedRoomDetail({
                      roomNo: task.roomNo,
                      propertyId: task.propertyId,
                      status: task.status,
                      color: task.color,
                      data: task.data,
                      type: task.type
                    })}
                    className="bg-white/5 border border-white/5 p-5 rounded-[2rem] flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-5">
                      <div className={`${task.bg} w-14 h-14 rounded-2xl flex items-center justify-center`}>
                        <task.icon className={task.color} size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">ห้อง {task.roomNo}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{getPropertyName(task.propertyId)}</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-2 inline-block ${task.type === 'repair' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="text-slate-800 group-hover:text-white transition-colors" size={20} />
                  </div>
                )) : (
                  <div className="col-span-2 py-20 text-center space-y-4 opacity-30">
                    <CheckCircle2 size={48} className="mx-auto text-emerald-400" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">All tasks completed</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Mini Tools */}
          <div className="space-y-8 h-full">
            <div className="bg-indigo-600 rounded-[3rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group h-[280px]">
              <div className="relative z-10 space-y-6">
                <h3 className="text-2xl font-black italic uppercase leading-none">System Status</h3>
                <div className="space-y-4">
                  <div className="bg-white/20 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase opacity-70">Cloud Sync</span>
                    <span className="text-xs font-black">Online (Firestore)</span>
                  </div>
                  <div className="bg-white/20 p-4 rounded-2xl flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase opacity-70">System Health</span>
                    <span className="text-xs font-black">Stable</span>
                  </div>
                </div>
              </div>
              <LayoutDashboard size={150} className="absolute -right-10 -bottom-10 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            </div>

            {/* Quick Access Grid */}
            <div className="bg-slate-900/60 border border-white/5 rounded-[3rem] p-8 md:p-10 shadow-2xl space-y-8 flex-1">
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Quick Access</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => onNavigate('managementInventory')}
                  className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] flex flex-col items-center gap-3 hover:bg-white/10 transition-all group"
                >
                  <Layers className="text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" size={20} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">Inventory</span>
                </button>
                <button 
                  onClick={() => onNavigate('expenses')}
                  className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] flex flex-col items-center gap-3 hover:bg-white/10 transition-all group"
                >
                  <DollarSign className="text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" size={20} />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">Finance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side Drawer for Filtered Rooms */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="relative w-full max-w-md bg-[#0f172a] h-full shadow-2xl border-l border-white/10 flex flex-col animate-in slide-in-from-right duration-500">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-3 italic">
                  <ShieldCheck className="text-indigo-400" size={24} />
                  {drawerFilter === 'all' ? 'All Units' : drawerFilter.toUpperCase()}
                </h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                  Total {filteredRooms.length} rooms found
                </p>
              </div>
              <button 
                onClick={() => setDrawerOpen(false)}
                className="w-10 h-10 bg-white/5 text-white rounded-full flex items-center justify-center hover:bg-rose-500 transition-all"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {filteredRooms.map((room) => (
                <div 
                  key={room.id}
                  className="bg-white/5 border border-white/5 p-5 rounded-3xl flex items-center justify-between group hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => {
                    setDrawerOpen(false);
                    setSelectedRoomDetail({
                      roomNo: room.roomNo,
                      propertyId: room.propertyId,
                      status: getStatusLabel(room.status),
                      color: getStatusColor(room.status),
                      data: room,
                      type: 'info'
                    });
                  }}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-lg font-black text-white">
                      {room.roomNo}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{getPropertyName(room.propertyId)}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                        {getStatusLabel(room.status)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase">Tenant</p>
                    <p className="text-xs font-bold text-white">{room.tenantName || '-'}</p>
                  </div>
                </div>
              ))}
              {filteredRooms.length === 0 && (
                <div className="py-20 text-center space-y-4 opacity-30">
                  <Info size={48} className="mx-auto text-slate-400" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No rooms matching filter</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Task/Room Detail Modal */}
      {selectedRoomDetail && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setSelectedRoomDetail(null)}
          />
          <div className="relative w-full max-w-lg bg-[#1e293b] rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-indigo-600 to-slate-900 p-8 text-white relative">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Property Insight Center</p>
                  <h3 className="text-3xl font-black italic">ห้อง {selectedRoomDetail.roomNo}</h3>
                  <p className="text-sm font-bold opacity-80">{getPropertyName(selectedRoomDetail.propertyId)}</p>
                </div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoomDetail(null);
                  }}
                  className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-rose-500 hover:scale-110 transition-all cursor-pointer z-[100] border border-white/10"
                >
                  <X size={24} strokeWidth={3} />
                </button>
              </div>
              <ShieldCheck className="absolute -right-10 -bottom-10 size-48 opacity-10 rotate-12" />
            </div>
            
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${selectedRoomDetail.color.replace('text-', 'bg-')}`} />
                    <span className="text-sm font-black text-white uppercase">{selectedRoomDetail.status}</span>
                  </div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Status Tracking</p>
                  <div className="flex items-center gap-2">
                    <Activity className="text-emerald-400" size={14} />
                    <span className="text-sm font-black text-emerald-400 uppercase">Live Synced</span>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
                <h4 className="text-xs font-black text-white uppercase flex items-center gap-2">
                  <Info className="text-indigo-400" size={16} />
                  Operational Details
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Tenant Name</span>
                    <span className="text-white font-black">{selectedRoomDetail.data.tenantName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Last Update</span>
                    <span className="text-white font-black">{selectedRoomDetail.data.lastUpdateTime || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Room Category</span>
                    <span className="text-white font-black uppercase">{selectedRoomDetail.data.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-4 opacity-50 italic">
                <span>Managed via ApartCloud Console</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Quick View Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10">
          <button 
            onClick={() => setSelectedReceipt(null)}
            className="absolute top-6 right-6 md:top-10 md:right-10 w-14 h-14 bg-white/10 text-white rounded-full flex items-center justify-center hover:bg-rose-500 transition-all z-[110]"
          >
            <ChevronRight className="rotate-180" size={32} />
          </button>
          <div className="relative w-full max-w-4xl max-h-full flex items-center justify-center animate-in zoom-in-95 duration-300">
            <img 
              src={selectedReceipt} 
              alt="Receipt" 
              className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-[0_0_80px_rgba(79,70,229,0.3)] border-2 border-white/10"
            />
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Firestore Document Storage</span>
              <a 
                href={selectedReceipt} 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-400 hover:text-white transition-colors"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagementDashboard;