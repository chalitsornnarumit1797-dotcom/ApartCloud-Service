import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, deleteDoc, addDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Building2, X, Clock, UserPlus, LogOut, Lock, Unlock, Trash2, Bell, ClipboardList, User, PieChart } from 'lucide-react';

// --- Firebase Config ---
const ACCESS_PIN = "933979"; 
const firebaseConfig = {
  apiKey: "AIzaSyASTtm9rgugCwKhcRC27j5ugJHFWbhM_8k",
  authDomain: "chalitsorn-s-workspace.firebaseapp.com",
  projectId: "chalitsorn-s-workspace",
  storageBucket: "chalitsorn-s-workspace.firebasestorage.app",
  messagingSenderId: "823661781920",
  appId: "1:823661781920:web:c92e026e81478b4ff63ac5",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const appId = 'apartcloud-frontdesk'; 

const STATUS_CONFIG = {
  appointment: { label: 'นัดดูห้อง', color: 'bg-sky-400', icon: <Clock size={16} /> },
  movedIn: { label: 'ย้ายเข้าแล้ว', color: 'bg-emerald-500', icon: <UserPlus size={16} /> },
  notice: { label: 'แจ้งออก', color: 'bg-amber-500', icon: <LogOut size={16} /> },
  available: { label: 'ห้องว่าง', color: 'bg-slate-200', icon: <Building2 size={16} /> }
};

const PROPERTIES = [
  { 
    id: 'mangmee', 
    name: 'บ้านมั่งมีทวีสุข', 
    floors: [
      { level: 7, rooms: Array.from({ length: 18 }, (_, i) => `7${String(i + 1).padStart(2, '0')}`) },
      { level: 6, rooms: Array.from({ length: 18 }, (_, i) => `6${String(i + 1).padStart(2, '0')}`) }, 
      { level: 5, rooms: Array.from({ length: 18 }, (_, i) => `5${String(i + 1).padStart(2, '0')}`) }, 
      { level: 4, rooms: Array.from({ length: 18 }, (_, i) => `4${String(i + 1).padStart(2, '0')}`) }, 
      { level: 3, rooms: Array.from({ length: 18 }, (_, i) => `3${String(i + 1).padStart(2, '0')}`) }, 
      { level: 2, rooms: Array.from({ length: 18 }, (_, i) => `2${String(i + 1).padStart(2, '0')}`) }
    ] 
  },
  { id: 'mytree', name: 'บ้านมายทรี 48', floors: [{ level: 5, rooms: ['501', '502', '503', '505', '506', '507', '508', '509', '510', '511', '512', '513', '514', '515'] }, { level: 4, rooms: ['401', '402', '403', '405', '406', '407', '408', '409', '410', '411', '412', '413', '414', '415'] }, { level: 3, rooms: ['301', '302', '303', '305', '306', '307', '308', '309', '310', '311', '312', '313', '314', '315'] }, { level: 2, rooms: ['201', '202', '203', '205', '206', '207', '208', '209', '210', '211', '212', '213', '214', '215'] }, { level: 1, rooms: Array.from({ length: 11 }, (_, i) => `1${String(i + 1).padStart(2, '0')}`) }] },
  { 
    id: 'khunluang', 
    name: 'บ้านคุณหลวง', 
    floors: [
      { level: 4, rooms: Array.from({ length: 6 }, (_, i) => `4-${i + 1}`) }, // แก้จาก / เป็น -
      { level: 3, rooms: Array.from({ length: 12 }, (_, i) => `3-${i + 1}`) }, 
      { level: 2, rooms: Array.from({ length: 12 }, (_, i) => `2-${i + 1}`) }, 
      { level: 1, rooms: Array.from({ length: 18 }, (_, i) => `1-${i + 1}`) }
    ] 
  },
  { id: 'meesap', name: 'อพาร์ทเม้นท์มีทรัพย์', floors: Array.from({ length: 5 }, (_, i) => ({ level: 5 - i, rooms: Array.from({ length: 6 }, (_, j) => `${5 - i}.${j + 1}`) })) },
  { id: 'meethong', name: 'อพาร์ทเม้นท์มีทอง', floors: Array.from({ length: 5 }, (_, i) => { const lv = 5 - i; return { level: lv, rooms: lv === 1 ? Array.from({ length: 11 }, (_, j) => `${102 + j}`) : Array.from({ length: 13 }, (_, j) => `${lv}${String(j + 1).padStart(2, '0')}`) }; }) }
];

// ... โค้ดส่วนที่เหลือเหมือนเดิม (App Component) ...
export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [activePropertyId, setActivePropertyId] = useState(PROPERTIES[0].id);
  const [roomStates, setRoomStates] = useState({});
  const [visitorLogs, setVisitorLogs] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [tempStatus, setTempStatus] = useState(null);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    signInAnonymously(auth).then(() => {
      onSnapshot(collection(db, 'apartments', appId, 'rooms'), (snap) => {
        const data = {}; snap.forEach(d => { data[d.id] = d.data(); });
        setRoomStates(data);
      });
      onSnapshot(collection(db, 'apartments', appId, 'logs'), (snap) => {
        const logs = []; snap.forEach(d => { logs.push({ id: d.id, ...d.data() }); });
        setVisitorLogs(logs.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)));
      });
    });
  }, []);

  const activeProperty = useMemo(() => PROPERTIES.find(p => p.id === activePropertyId), [activePropertyId]);

  const todayTasks = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return Object.entries(roomStates)
      .filter(([id, val]) => val.date === today && val.status !== 'available' && id.startsWith(activePropertyId))
      .map(([id, val]) => ({ id, ...val }));
  }, [roomStates, activePropertyId]);

  const propertyStats = useMemo(() => {
    const stats = { available: 0, appointment: 0, movedIn: 0, notice: 0, total: 0 };
    activeProperty?.floors.forEach(f => f.rooms.forEach(r => {
      const status = roomStates[`${activePropertyId}_${r}`]?.status || 'available';
      stats[status]++;
      stats.total++;
    }));
    return stats;
  }, [roomStates, activePropertyId, activeProperty]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    const docId = `${activePropertyId}_${selectedRoom}`;
    const timestamp = Date.now();
    
    if (tempStatus === 'available') {
      await setDoc(doc(db, 'apartments', appId, 'rooms', docId), { status: 'available', updatedAt: timestamp });
    } else {
      const formData = new FormData(e.target);
      const data = {
        status: tempStatus,
        lastVisitor: formData.get('name') || "",
        lastPhone: formData.get('phone') || "",
        date: formData.get('date') || "",
        time: formData.get('time') || "",
        updatedAt: timestamp
      };
      await setDoc(doc(db, 'apartments', appId, 'rooms', docId), data, { merge: true });
      if (data.lastVisitor) {
        await addDoc(collection(db, 'apartments', appId, 'logs'), {
          ...data, roomNo: selectedRoom, propertyName: activeProperty.name, 
          statusLabel: STATUS_CONFIG[tempStatus].label, createdAt: timestamp
        });
      }
    }
    setSelectedRoom(null);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-['Prompt']">
        <form onSubmit={(e) => { e.preventDefault(); pinInput === ACCESS_PIN ? setIsUnlocked(true) : alert('PIN ผิด!'); }} className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-sm space-y-6 text-center">
          <Lock className="mx-auto text-indigo-600" size={48} />
          <h2 className="text-xl font-black italic">ApartCloud FrontDesk</h2>
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl text-center text-4xl font-bold border-2 focus:border-indigo-500 outline-none" placeholder="PIN" autoFocus />
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">LOGIN</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-['Prompt'] text-slate-800">
      <nav className="bg-white border-b p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
        <div className="font-black text-indigo-600 italic flex items-center gap-2"><Building2 size={20}/> FrontDesk</div>
        <div className="flex gap-1 font-bold text-[9px]">
          {['dashboard', 'summary', 'history'].map(v => (
            <button key={v} onClick={() => setView(v)} className={`px-4 py-2 rounded-xl transition-all ${view === v ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>{v.toUpperCase()}</button>
          ))}
          <button onClick={() => setIsUnlocked(false)} className="p-2 opacity-30"><Unlock size={16}/></button>
        </div>
      </nav>

      <main className="p-4 max-w-7xl mx-auto space-y-6">
        {view === 'dashboard' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1 bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                   <h2 className="font-black text-sm flex items-center gap-2 text-indigo-600"><PieChart size={18}/> ภาพรวมตึก</h2>
                   <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full uppercase">Total {propertyStats.total}</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${config.color}`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between text-[10px] font-bold uppercase">
                          <span>{config.label}</span>
                          <span>{propertyStats[key]} ห้อง</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div className={`h-full ${config.color}`} style={{ width: `${(propertyStats[key]/propertyStats.total)*100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl text-white space-y-4">
                <h2 className="font-black text-sm flex items-center gap-2"><Bell size={18}/> นัดหมายวันนี้ ({activeProperty.name})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {todayTasks.length > 0 ? todayTasks.map(task => (
                    <div key={task.id} className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex justify-between items-center">
                      <div>
                        <p className="font-black text-lg leading-none">{task.id.split('_')[1]}</p>
                        <p className="text-[9px] font-bold opacity-70 uppercase mt-1">{STATUS_CONFIG[task.status].label} • {task.lastVisitor}</p>
                      </div>
                      <div className="text-right font-black text-xs">🕒 {task.time || '--:--'}</div>
                    </div>
                  )) : <p className="text-xs opacity-60 italic py-4 text-center w-full col-span-2">ไม่มีนัดหมายใหม่วันนี้</p>}
                </div>
              </div>
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
              {PROPERTIES.map(p => (
                <button key={p.id} onClick={() => setActivePropertyId(p.id)} className={`px-6 py-2 rounded-2xl border-2 font-black whitespace-nowrap transition-all ${activePropertyId === p.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{p.name}</button>
              ))}
            </div>

            {activeProperty?.floors.map(floor => (
              <div key={floor.level} className="space-y-4">
                <h3 className="font-black text-slate-400 text-[10px] uppercase pl-2 tracking-widest">ชั้น {floor.level}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {floor.rooms.map(roomNo => {
                    const info = roomStates[`${activePropertyId}_${roomNo}`] || { status: 'available' };
                    return (
                      <button key={roomNo} onClick={() => { setSelectedRoom(roomNo); setTempStatus(info.status); }} className={`p-6 rounded-[2rem] font-black text-center shadow-sm border-b-4 border-black/10 transition-all active:scale-95 ${STATUS_CONFIG[info.status].color} ${info.status === 'available' ? 'text-slate-400' : 'text-white'}`}>
                        <div className="text-2xl leading-none">{roomNo}</div>
                        <div className="text-[8px] font-black uppercase opacity-60 mt-1">{STATUS_CONFIG[info.status].label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : view === 'summary' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-800">
             {['appointment', 'movedIn', 'notice'].map(st => (
               <div key={st} className="bg-white rounded-[2rem] p-6 shadow-sm border">
                 <h4 className="font-black uppercase text-xs mb-6 flex items-center gap-2 text-indigo-600">{STATUS_CONFIG[st].icon} {STATUS_CONFIG[st].label}</h4>
                 <div className="space-y-3">
                   {Object.entries(roomStates).filter(([key, val]) => val.status === st && key.startsWith(activePropertyId)).map(([key, item]) => (
                     <div key={key} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-center text-xs">
                        <p className="font-black text-lg text-slate-700">{key.split('_')[1]}</p>
                        <div className="text-right">
                          <p className="font-black">{item.lastVisitor || '-'}</p>
                          <p className="text-[9px] font-bold text-indigo-600">{item.lastPhone}</p>
                        </div>
                     </div>
                   ))}
                 </div>
               </div>
             ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] p-8 space-y-6 shadow-sm">
            <h2 className="text-xl font-black italic flex items-center gap-2"><ClipboardList/> Room History</h2>
            <div className="space-y-3">
              {visitorLogs.map(log => (
                <div key={log.id} className="p-4 bg-slate-50 rounded-2xl flex justify-between items-center border border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-600"><User size={16}/></div>
                    <div>
                      <p className="font-black text-sm">ห้อง {log.roomNo} - {log.lastVisitor}</p>
                      <p className="text-[9px] text-slate-400 font-black uppercase">{log.propertyName} • {log.statusLabel}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500">{log.date}</p>
                    <button onClick={() => deleteDoc(doc(db, 'apartments', appId, 'logs', log.id))} className="text-rose-300 hover:text-rose-500 p-2"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-4 font-['Prompt']">
          <form onSubmit={handleUpdate} className="bg-white rounded-[3rem] w-full max-w-lg p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div><h3 className="text-3xl font-black italic">Room {selectedRoom}</h3><p className="text-[10px] font-bold text-slate-400 uppercase">{activeProperty.name}</p></div>
              <button type="button" onClick={() => setSelectedRoom(null)}><X size={24}/></button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(STATUS_CONFIG).map(([k,v]) => (
                <button type="button" key={k} onClick={() => setTempStatus(k)} className={`p-3 rounded-2xl border-2 text-[9px] font-black flex flex-col items-center gap-1 transition-all ${tempStatus===k?'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md':'border-slate-50 text-slate-300'}`}>{v.icon}{v.label}</button>
              ))}
            </div>

            {tempStatus !== 'available' ? (
              <div className="bg-slate-50 p-6 rounded-[2rem] border space-y-4">
                <input name="name" placeholder="ชื่อผู้ติดต่อ/ผู้เช่า..." defaultValue={roomStates[`${activePropertyId}_${selectedRoom}`]?.lastVisitor || ""} className="w-full p-4 rounded-xl font-bold border outline-none bg-white" required />
                <input name="phone" placeholder="เบอร์โทรศัพท์..." defaultValue={roomStates[`${activePropertyId}_${selectedRoom}`]?.lastPhone || ""} className="w-full p-4 rounded-xl font-bold border outline-none bg-white" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><p className="text-[9px] font-black pl-2 uppercase text-slate-400">วันที่นัดหมาย</p><input type="date" name="date" defaultValue={roomStates[`${activePropertyId}_${selectedRoom}`]?.date || ""} className="w-full p-4 rounded-xl font-bold border bg-white" /></div>
                  <div className="space-y-1"><p className="text-[9px] font-black pl-2 uppercase text-slate-400">เวลา</p><input name="time" placeholder="00:00" defaultValue={roomStates[`${activePropertyId}_${selectedRoom}`]?.time || ""} className="w-full p-4 rounded-xl font-bold border bg-white text-center" /></div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-10 rounded-[2rem] border border-dashed text-center text-slate-400">
                <Building2 size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm font-bold">กดปุ่มด้านล่างเพื่อเคลียร์ห้องให้เป็น "ห้องว่าง"</p>
              </div>
            )}
            
            <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all uppercase tracking-tight">
              {tempStatus === 'available' ? 'Confirm Make Available' : 'Update Room Status'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}