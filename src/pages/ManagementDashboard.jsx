import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Building2, CalendarClock, Clock3, Wrench, Wind, ShieldCheck } from 'lucide-react';

const STATUS_BADGES = {
  pending: 'bg-amber-400/20 text-amber-200 border-amber-300/30',
  done: 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30',
  postponed: 'bg-fuchsia-400/20 text-fuchsia-200 border-fuchsia-300/30'
};

const fmtDate = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getTaskType = (room) => {
  if (room.status === 'maintenance' || room.status === 'finalQC') return 'technician';
  return 'housekeeping';
};

const getTaskIcon = (type) => (type === 'technician' ? '🔧' : '🧹');

const ProgressBar = ({ label, value, maxValue, gradient, delayed }) => {
  const width = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 6 : 0) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span className="font-semibold tracking-wide">{label}</span>
        <span className="font-black text-white">{value}</span>
      </div>
      <div className="h-3 rounded-full bg-slate-900/80 border border-slate-700/60 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${gradient} ${delayed ? 'animate-pulse' : ''}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
};

const RoomTaskCard = ({
  task,
  onUpdateRoomTask,
  onPostponeRoomTask,
  onSetRoomExecutionDate
}) => {
  const badgeClass = STATUS_BADGES[task.taskStatus] || STATUS_BADGES.pending;
  return (
    <article className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 md:p-6 space-y-4 shadow-[0_10px_40px_rgba(15,23,42,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-cyan-200 uppercase tracking-[0.25em] font-bold">Room Mission</p>
          <h4 className="text-lg md:text-xl font-extrabold text-white mt-1">
            {getTaskIcon(task.type)} {task.propertyName} • ห้อง {task.roomNo}
          </h4>
          <p className="text-sm text-slate-300 mt-1">{task.label}</p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full border text-[10px] uppercase tracking-wider font-black ${badgeClass}`}>
          {task.taskStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
          <span className="flex items-center gap-2 mb-2"><CalendarClock size={14} /> วันเข้าปฏิบัติงาน</span>
          <input
            type="date"
            value={task.executionDate || ''}
            onChange={(e) => onSetRoomExecutionDate(task.id, e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
          <span className="flex items-center gap-2 mb-2"><Clock3 size={14} /> เลื่อนงานไปวัน</span>
          <input
            type="date"
            value={task.postponedTo || ''}
            onChange={(e) => onPostponeRoomTask(task.id, e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-fuchsia-400"
          />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onUpdateRoomTask(task.id, 'done')}
          className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-extrabold py-2.5 hover:brightness-110 transition"
        >
          ทำเสร็จแล้ว
        </button>
        <button
          onClick={() => onUpdateRoomTask(task.id, 'pending')}
          className="flex-1 rounded-2xl bg-slate-800 text-white border border-slate-600 font-bold py-2.5 hover:bg-slate-700 transition"
        >
          รีเซ็ตเป็น Pending
        </button>
      </div>
    </article>
  );
};

const MaintenanceTaskCard = ({
  task,
  onUpdateMaintenanceTask,
  onPostponeMaintenanceTask,
  onSetMaintenanceExecutionDate
}) => {
  const badgeClass = STATUS_BADGES[task.taskStatus] || STATUS_BADGES.pending;
  return (
    <article className="rounded-3xl border border-white/15 bg-white/5 backdrop-blur-xl p-5 md:p-6 space-y-4 shadow-[0_10px_40px_rgba(15,23,42,0.45)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] text-fuchsia-200 uppercase tracking-[0.25em] font-bold">Maintenance Log</p>
          <h4 className="text-lg md:text-xl font-extrabold text-white mt-1">🔧 {task.title || 'งานซ่อมทั่วไป'}</h4>
          <p className="text-sm text-slate-300 mt-1">{task.propertyName || 'ไม่ระบุโครงการ'} • ห้อง {task.roomNo || '-'}</p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full border text-[10px] uppercase tracking-wider font-black ${badgeClass}`}>
          {task.taskStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
          <span className="flex items-center gap-2 mb-2"><CalendarClock size={14} /> วันดำเนินการ</span>
          <input
            type="date"
            value={task.executionDate || ''}
            onChange={(e) => onSetMaintenanceExecutionDate(task.id, e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-400"
          />
        </label>
        <label className="rounded-2xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
          <span className="flex items-center gap-2 mb-2"><Clock3 size={14} /> เลื่อนงานไปวัน</span>
          <input
            type="date"
            value={task.postponedTo || ''}
            onChange={(e) => onPostponeMaintenanceTask(task.id, e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-fuchsia-400"
          />
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onUpdateMaintenanceTask(task.id, 'done')}
          className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-slate-950 font-extrabold py-2.5 hover:brightness-110 transition"
        >
          ปิดงานซ่อม
        </button>
        <button
          onClick={() => onUpdateMaintenanceTask(task.id, 'pending')}
          className="flex-1 rounded-2xl bg-slate-800 text-white border border-slate-600 font-bold py-2.5 hover:bg-slate-700 transition"
        >
          กลับไป Pending
        </button>
      </div>
    </article>
  );
};

const ManagementDashboard = ({
  roomStates = {},
  maintenanceLogs = [],
  properties = [],
  onUpdateRoomTask,
  onPostponeRoomTask,
  onUpdateMaintenanceTask,
  onPostponeMaintenanceTask,
  onSetRoomExecutionDate,
  onSetMaintenanceExecutionDate
}) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 450);
    return () => clearTimeout(timer);
  }, []);

  const propertyNameById = useMemo(
    () => Object.fromEntries(properties.map((item) => [item.id, item.name])),
    [properties]
  );

  const roomTasks = useMemo(() => {
    const eligible = ['cleaningPre', 'maintenance', 'cleaningPost', 'finalQC'];
    return Object.entries(roomStates)
      .filter(([, room]) => eligible.includes(room.status))
      .map(([id, room]) => ({
        id,
        roomNo: id.split('_')[1] || '-',
        propertyName: propertyNameById[room.propertyId] || room.propertyId || 'Unknown Property',
        label: room.status,
        type: getTaskType(room),
        taskStatus: room.managementTaskStatus || 'pending',
        executionDate: room.managementExecutionDate || '',
        postponedTo: room.managementPostponedTo || '',
        updatedAt: room.managementUpdatedAt || ''
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }, [propertyNameById, roomStates]);

  const maintenanceTasks = useMemo(
    () =>
      (maintenanceLogs || [])
        .map((log) => ({
          ...log,
          taskStatus: log.taskStatus || 'pending',
          propertyName: propertyNameById[log.propertyId] || log.propertyId || 'Unknown Property'
        }))
        .sort((a, b) => ((a.updatedAt || '') < (b.updatedAt || '') ? 1 : -1)),
    [maintenanceLogs, propertyNameById]
  );

  const overview = useMemo(() => {
    const cleaning = roomTasks.filter((item) => item.type === 'housekeeping').length;
    const technical = roomTasks.filter((item) => item.type === 'technician').length + maintenanceTasks.length;
    const doneCount =
      roomTasks.filter((item) => item.taskStatus === 'done').length +
      maintenanceTasks.filter((item) => item.taskStatus === 'done').length;
    const pendingCount = roomTasks.length + maintenanceTasks.length - doneCount;
    return {
      cleaning,
      technical,
      doneCount,
      pendingCount,
      total: roomTasks.length + maintenanceTasks.length
    };
  }, [roomTasks, maintenanceTasks]);

  const chartMax = Math.max(overview.cleaning, overview.technical, overview.total, 1);

  return (
    <section
      className="min-h-screen p-4 md:p-8 lg:p-10 bg-[#0f172a] text-white"
      style={{ fontFamily: 'Inter, Urbanist, ui-sans-serif, system-ui, sans-serif' }}
    >
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        <header className="rounded-[2rem] md:rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-2xl p-6 md:p-8 shadow-[0_18px_80px_rgba(2,6,23,0.55)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/90 font-bold">Premium Operations Center</p>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mt-2">Management Dashboard</h1>
              <p className="text-slate-300 mt-3 max-w-2xl text-sm md:text-base">
                
              </p>
            </div>
            <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-4 inline-flex items-center gap-3 self-start">
              <Sparkles className="text-cyan-200" size={18} />
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-100 font-bold">Live Snapshot</p>
                <p className="text-lg font-extrabold">{new Date().toLocaleString('th-TH')}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
          <article className="lg:col-span-2 rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl p-6 md:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <Wind className="text-emerald-300" size={20} />
              <h2 className="text-xl md:text-2xl font-extrabold">Professional Cleaning Chart</h2>
            </div>
            <ProgressBar
              label="🧹 Housekeeping Queue"
              value={overview.cleaning}
              maxValue={chartMax}
              gradient="bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-700"
              delayed={!loaded}
            />
            <ProgressBar
              label="🔧 Technical + Maintenance"
              value={overview.technical}
              maxValue={chartMax}
              gradient="bg-gradient-to-r from-cyan-300 via-sky-500 to-blue-700"
              delayed={!loaded}
            />
            <ProgressBar
              label="✅ Completed / All Tasks"
              value={overview.doneCount}
              maxValue={Math.max(overview.total, 1)}
              gradient="bg-gradient-to-r from-fuchsia-300 via-violet-500 to-indigo-700"
              delayed={!loaded}
            />
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/5 backdrop-blur-2xl p-6 md:p-7 space-y-4">
            <h2 className="text-xl md:text-2xl font-extrabold flex items-center gap-2">
              <ShieldCheck className="text-violet-200" size={20} />
              Control Tower
            </h2>
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-950/70 border border-slate-700/70 p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider">Total Missions</p>
                <p className="text-3xl font-black mt-1">{overview.total}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 border border-slate-700/70 p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider">Pending</p>
                <p className="text-3xl font-black text-amber-300 mt-1">{overview.pendingCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/70 border border-slate-700/70 p-4">
                <p className="text-slate-400 text-xs uppercase tracking-wider">Completed</p>
                <p className="text-3xl font-black text-emerald-300 mt-1">{overview.doneCount}</p>
              </div>
            </div>
          </article>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Building2 className="text-cyan-200" size={18} />
              <h3 className="text-xl md:text-2xl font-extrabold">Room Task Cards</h3>
            </div>
            {roomTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-slate-300">
                ไม่มีงานห้องที่ต้องติดตามตอนนี้
              </div>
            ) : (
              <div className="space-y-4">
                {roomTasks.map((task) => (
                  <RoomTaskCard
                    key={task.id}
                    task={task}
                    onUpdateRoomTask={onUpdateRoomTask}
                    onPostponeRoomTask={onPostponeRoomTask}
                    onSetRoomExecutionDate={onSetRoomExecutionDate}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Wrench className="text-fuchsia-200" size={18} />
              <h3 className="text-xl md:text-2xl font-extrabold">Maintenance Command</h3>
            </div>
            {maintenanceTasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-slate-300">
                ไม่มี maintenance logs ค้างอยู่
              </div>
            ) : (
              <div className="space-y-4">
                {maintenanceTasks.map((task) => (
                  <MaintenanceTaskCard
                    key={task.id}
                    task={task}
                    onUpdateMaintenanceTask={onUpdateMaintenanceTask}
                    onPostponeMaintenanceTask={onPostponeMaintenanceTask}
                    onSetMaintenanceExecutionDate={onSetMaintenanceExecutionDate}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-4 text-xs md:text-sm text-slate-300 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <span>Dark Mode • Glassmorphism • Mobile Polished Layout</span>
          <span className="font-semibold">Last Sync: {fmtDate(new Date().toISOString())}</span>
        </footer>
      </div>
    </section>
  );
};

export default ManagementDashboard;
