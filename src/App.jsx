import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Building2, X, Clock, Wrench, ClipboardCheck, Lock, Unlock, User, CheckCircle2, Key, Archive, LayoutGrid, UserCheck, Sparkles, Wind, Tablet as WashingMachine, Calendar, AlertTriangle, Settings, Camera, Phone, BookOpen, History, Save, Info, Bell, Hammer, Activity, ShieldCheck, Tag, ShoppingBag, BarChart3, ShoppingCart, ChevronRight } from 'lucide-react';

// ==========================================
// 1. CONFIGURATION & CREDENTIALS
// ==========================================
const ACCESS_PIN = "933979"; // ENGINEER MODE
const SALES_PIN = "111111"; // SALES MODE
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
const appId = 'apartcloud-service'; 

// ==========================================
// 2. CONSTANTS & MAPPINGS
// ==========================================
const STEPS = {
  rented: { label: 'มีผู้เช่า', color: 'bg-slate-400', next: 'keyReturn' },
  keyReturn: { label: 'รอคืนกุญแจ', color: 'bg-orange-400', next: 'pendingCheck' },
  pendingCheck: { label: 'คิวตรวจห้อง/เงินประกัน', color: 'bg-rose-500', next: 'cleaningPre' },
  cleaningPre: { label: 'ทำความสะอาดก่อนซ่อม', color: 'bg-sky-400', next: 'maintenance' },
  maintenance: { label: 'เข้าซ่อมบำรุง', color: 'bg-amber-500', next: 'cleaningPost' },
  cleaningPost: { label: 'ทำความสะอาดก่อนขาย', color: 'bg-cyan-500', next: 'finalQC' },
  finalQC: { label: 'ตรวจความพร้อมก่อนขาย', color: 'bg-indigo-500', next: 'ready' },
  ready: { label: 'พร้อมขาย', color: 'bg-emerald-500', next: 'rented' },
  booked: { label: 'จองแล้ว', color: 'bg-purple-600', next: 'rented' }
};

const PROPERTIES = [
  { id: 'mangmee', name: 'บ้านมั่งมีทวีสุข', floors: [7,6,5,4,3,2].map(l => ({ level: l, rooms: Array.from({ length: 18 }, (_, i) => `${l}${String(i + 1).padStart(2, '0')}`) })) },
  { id: 'mytree', name: 'บ้านมายทรี 48', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: l===1 ? Array.from({length:11},(_,i)=>`1${String(i+1).padStart(2,'0')}`) : ['01','02','03','05','06','07','08','09','10','11','12','13','14','15'].map(r => `${l}${r}`) })) },
  { id: 'khunluang', name: 'บ้านคุณหลวง', floors: [4,3,2,1].map(l => ({ level: l, rooms: Array.from({ length: l===4?6:l===1?18:12 }, (_, i) => `${l}-${i + 1}`) })) },
  { id: 'meesap', name: 'อพาร์ทเม้นท์มีทรัพย์', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: Array.from({ length: 6 }, (_, j) => `${l}.${j + 1}`) })) },
  { id: 'meethong', name: 'อพาร์ทเม้นท์มีทอง', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: l === 1 ? Array.from({ length: 11 }, (_, j) => `${102 + j}`) : Array.from({ length: 13 }, (_, j) => `${l}${String(j + 1).padStart(2, '0')}`) })) }
];

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function App() {
  const [userRole, setUserRole] = useState(null); 
  const [pinInput, setPinInput] = useState("");
  const [activePropertyId, setActivePropertyId] = useState('mangmee');
  const [viewMode, setViewMode] = useState('grid');
  const [workerName, setWorkerName] = useState("");
  const [roomStates, setRoomStates] = useState({});
  const [airPlans, setAirPlans] = useState({});
  const [wmPlans, setWmPlans] = useState({});
  const [roomSpecs, setRoomSpecs] = useState({});
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showLogbook, setShowLogbook] = useState(false);
  const [repairs, setRepairs] = useState({});
  const [qcChecks, setQcChecks] = useState({});
  const [logHistory, setLogHistory] = useState([]);

  // --- Realtime Data Sync ---
  useEffect(() => {
    signInAnonymously(auth).then(() => {
      onSnapshot(collection(db, 'apartments', appId, 'rooms'), (snap) => {
        const data = {}; snap.forEach(d => { data[d.id] = d.data(); });
        setRoomStates(data);
      });
      onSnapshot(collection(db, 'apartments', appId, 'airPlans'), (snap) => {
        const data = {}; snap.forEach(d => { data[d.id] = d.data(); });
        setAirPlans(data);
      });
      onSnapshot(collection(db, 'apartments', appId, 'wmPlans'), (snap) => {
        const data = {}; snap.forEach(d => { data[d.id] = d.data(); });
        setWmPlans(data);
      });
      onSnapshot(collection(db, 'apartments', appId, 'roomSpecs'), (snap) => {
        const data = {}; snap.forEach(d => { data[d.id] = d.data(); });
        setRoomSpecs(data);
      });
    });
  }, []);

  // --- Technical Log History ---
  useEffect(() => {
    if (selectedRoom && showLogbook) {
      const q = query(collection(db, 'apartments', appId, 'logs'), where('roomKey', '==', `${activePropertyId}_${selectedRoom}`), orderBy('timestamp', 'desc'), limit(15));
      onSnapshot(q, (snap) => {
        const logs = []; snap.forEach(d => logs.push(d.data()));
        setLogHistory(logs);
      });
    }
  }, [selectedRoom, showLogbook, activePropertyId]);

  // --- Update Action Handler ---
  const handleUpdateRoom = async (nextStep) => {
    if (!workerName) return alert("โปรดระบุชื่อผู้บันทึกงาน!");
    const docId = `${activePropertyId}_${selectedRoom}`;
    const timestamp = new Date().toLocaleString('th-TH');
    const info = roomStates[docId] || { status: 'rented' };
    
    let updateData = { 
      ...info, 
      status: nextStep, 
      lastUpdateBy: workerName, 
      lastUpdateTime: timestamp, 
      propertyId: activePropertyId 
    };
    
    // จัดการข้อมูลจากฟอร์มโหมดแจ้งย้ายออก
    if (info.status === 'rented') {
      const form = document.getElementById('modalForm');
      updateData.tenantName = form.tName.value;
      updateData.tenantPhone = form.tPhone.value;
      updateData.moveOutDate = form.moveOutDate.value; 
    }
    
    if (info.status === 'pendingCheck') updateData.repairData = repairs;
    if (info.status === 'finalQC') updateData.qcData = qcChecks;

    // เก็บประวัติการซ่อมเมื่อวิศวกรยืนยันซ่อมเสร็จ
    if (info.status === 'maintenance' && nextStep === 'cleaningPost') {
      await addDoc(collection(db, 'apartments', appId, 'logs'), { 
        roomKey: docId, 
        action: "ช่างซ่อมบำรุง: ดำเนินการเสร็จแล้ว", 
        worker: workerName, 
        timestamp: Date.now(), 
        displayTime: timestamp, 
        details: Object.keys(info.repairData || {}).join(', ') 
      });
    }

    // ล้างข้อมูลชั่วคราวเมื่อห้องพร้อมขายใหม่
    if (nextStep === 'ready') { 
      delete updateData.repairData; 
      delete updateData.qcData; 
      delete updateData.tenantName; 
      delete updateData.moveOutDate; 
    }
    
    await setDoc(doc(db, 'apartments', appId, 'rooms', docId), updateData);
    setSelectedRoom(null); setRepairs({}); setQcChecks({});
  };

  const handleUpdatePlan = async (type, id, field, value) => {
    if (!workerName) return alert("ระบุชื่อผู้บันทึก!");
    const col = type === 'air' ? 'airPlans' : 'wmPlans';
    const docId = `${activePropertyId}_${id}`;
    const cur = (type === 'air' ? airPlans : wmPlans)[docId] || {};
    await setDoc(doc(db, 'apartments', appId, col, docId), { 
      ...cur, [field]: value, updateBy: workerName, updatedAt: new Date().toLocaleString('th-TH'), propertyId: activePropertyId 
    });
  };

  // --- Logic for Dashboard Stats ---
  const missions = useMemo(() => {
    const list = { repair: [], air: [], wm: false };
    const today = new Date().toISOString().split('T')[0];
    Object.entries(roomStates).forEach(([k, v]) => {
      if (v.propertyId === activePropertyId && v.status === 'maintenance') list.repair.push(k.split('_')[1]);
    });
    Object.entries(airPlans).forEach(([k, v]) => {
      if (k.startsWith(activePropertyId) && v.date === today && !v.done) list.air.push(k.split('_')[1]);
    });
    if (wmPlans[`${activePropertyId}_COMMON`] && !wmPlans[`${activePropertyId}_COMMON`].done) list.wm = true;
    return list;
  }, [roomStates, airPlans, wmPlans, activePropertyId]);

  // ==========================================
  // 4. AUTHENTICATION VIEW
  // ==========================================
  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <form onSubmit={(e) => { e.preventDefault(); if (pinInput===ACCESS_PIN) setUserRole('engineer'); else if (pinInput===SALES_PIN) setUserRole('sales'); else alert('PIN ไม่ถูกต้อง'); }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center space-y-6 font-sans">
          <Building2 size={48} className="mx-auto text-indigo-600" />
          <h2 className="text-xl font-black italic uppercase text-slate-800">APARTCLOUD LOGIN</h2>
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl text-center text-4xl font-bold border-2 outline-none" placeholder="PIN" />
          <div className="flex justify-between text-[10px] font-bold text-slate-400"><span>ENGINEER: 933979</span><span>SALES: 111111</span></div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-transform">Unlock System</button>
        </form>
      </div>
    );
  }

  const activeProperty = PROPERTIES.find(p => p.id === activePropertyId);

  // ==========================================
  // 5. MAIN RENDER
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
      {/* --- Global Navigation --- */}
      <nav className="bg-white border-b p-4 sticky top-0 z-40 flex flex-wrap justify-between items-center px-6 shadow-sm gap-4">
        <div className="font-black text-indigo-600 flex items-center gap-2 text-xl italic">
            <Building2 size={24}/> APARTCLOUD 
            <span className={`text-[10px] px-2 py-1 rounded-lg uppercase tracking-tighter ${userRole==='engineer'?'bg-amber-100 text-amber-600':'bg-purple-100 text-purple-600'}`}>
                {userRole==='engineer'?'ENGINEER MODE':'SALES MODE'}
            </span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
           <button onClick={()=>setViewMode('grid')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='grid'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>ผังห้อง</button>
           <button onClick={()=>setViewMode('summary')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='summary'?'bg-white text-indigo-600 shadow-sm':'text-slate-400'}`}>Summary</button>
           {userRole === 'engineer' && (
             <>
                <button onClick={()=>setViewMode('airPlanner')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='airPlanner'?'bg-sky-500 text-white shadow-sm':'text-slate-400'}`}>แผนแอร์</button>
                <button onClick={()=>setViewMode('wmPlanner')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='wmPlanner'?'bg-indigo-600 text-white shadow-sm':'text-slate-400'}`}>เครื่องซักผ้า</button>
             </>
           )}
           <button onClick={()=>setUserRole(null)} className="p-2 text-slate-300 hover:text-rose-500"><Unlock size={18}/></button>
        </div>
      </nav>

      <main className="p-4 max-w-7xl mx-auto space-y-6">
        {/* --- Property Switching --- */}
        <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2">
          {PROPERTIES.map(p => (
            <button key={p.id} onClick={() => setActivePropertyId(p.id)} className={`px-6 py-3 rounded-2xl border-2 font-black whitespace-nowrap transition-all ${activePropertyId === p.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{p.name}</button>
          ))}
        </div>

        {viewMode === 'summary' ? (
           /* --- SUMMARY & PARTNER EXPORT --- */
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-orange-500 p-6 rounded-[2.5rem] text-white shadow-lg">
                 <h4 className="font-black text-xs uppercase flex items-center gap-2 mb-4"><Clock size={18}/> แผนแจ้งย้ายออกล่วงหน้า (Check-out Planning)</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'keyReturn').map(([k,v]) => (
                       <div key={k} className="bg-white/10 p-4 rounded-2xl flex justify-between items-center">
                          <div><p className="font-black text-lg">ห้อง {k.split('_')[1]}</p><p className="text-[10px] opacity-70">ลูกค้า: {v.tenantName || '-'}</p></div>
                          <div className="text-right"><p className="text-[8px] font-bold uppercase">กำหนดออก</p><p className="font-black text-lg underline">{v.moveOutDate || 'ยังไม่ระบุ'}</p></div>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="bg-sky-500 p-6 rounded-[2.5rem] text-white shadow-lg">
                 <h4 className="font-black text-xs uppercase flex items-center gap-2 mb-4 font-sans"><Wind size={18}/> งานล้างแอร์วันนี้ (ส่งพาร์ทเนอร์แอร์)</h4>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {Object.entries(airPlans).filter(([k,v]) => k.startsWith(activePropertyId) && v.date === new Date().toISOString().split('T')[0] && !v.done).map(([k,v]) => (
                       <div key={k} className="bg-white/10 p-4 rounded-2xl flex justify-between items-center">
                          <span className="font-black text-lg">ห้อง {k.split('_')[1]}</span>
                          <span className="text-[10px] font-bold opacity-80">{v.time} | การเข้า: {v.access === 'allow' ? 'เปิดได้' : 'เคาะ'}</span>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="bg-amber-500 p-6 rounded-[2.5rem] text-white shadow-lg font-sans">
                 <h4 className="font-black text-xs uppercase flex items-center gap-2 mb-4 font-sans"><Hammer size={18}/> รายการตรวจซ่อม (ส่งทีมช่างบำรุง)</h4>
                 <div className="space-y-3 font-sans">
                    {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'maintenance').map(([k,v]) => (
                       <div key={k} className="bg-white/10 p-4 rounded-2xl">
                          <p className="font-black text-lg">ห้อง {k.split('_')[1]}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                             {v.repairData && Object.entries(v.repairData).map(([name, data]) => data.checked && (
                                <span key={name} className="bg-white/20 text-[9px] px-2 py-1 rounded-lg">🛠️ {name} ({data.note || 'ตรวจซ่อม'})</span>
                             ))}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        ) : viewMode === 'airPlanner' ? (
           /* --- FULL SCALE AIR PLANNER TABLE --- */
           <div className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden font-sans">
              <div className="bg-sky-500 p-8 text-white flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase">Engineer: Air Planner</h2></div>
              <div className="overflow-x-auto font-sans">
                 <table className="w-full text-left text-[11px] font-sans">
                    <thead className="bg-slate-50 font-black text-slate-400 uppercase border-b font-sans">
                       <tr><th className="p-6 font-sans">ห้อง</th><th className="p-6">วัน/เวลา</th><th className="p-6">การเข้า</th><th className="p-6">น้ำยา(≥14)</th><th className="p-6">สถานะ</th><th className="p-6">โน้ต</th><th className="p-6 text-center">จบงาน</th></tr>
                    </thead>
                    <tbody>
                       {activeProperty.floors.flatMap(f => f.rooms).map((room) => {
                          const data = airPlans[`${activePropertyId}_${room}`] || {};
                          return (
                             <tr key={room} className={`border-b ${data.done ? 'opacity-30 grayscale' : ''} font-sans`}>
                                <td className="p-6 font-black text-xl font-sans">{room}</td>
                                <td className="p-6 font-sans"><input type="date" value={data.date || ""} onChange={e => handleUpdatePlan('air', room, 'date', e.target.value)} className="block outline-none" /><input type="time" value={data.time || ""} onChange={e => handleUpdatePlan('air', room, 'time', e.target.value)} className="block text-sky-600 font-bold outline-none" /></td>
                                <td className="p-6 font-sans"><select value={data.access || ""} onChange={e => handleUpdatePlan('air', room, 'access', e.target.value)} className="p-2 bg-slate-100 rounded-xl font-black text-[9px] outline-none"><option value="">เลือก</option><option value="allow">เปิดได้</option><option value="knock">เคาะก่อน</option></select></td>
                                <td className="p-6 font-sans"><input type="number" value={data.pressure || ""} onChange={e => handleUpdatePlan('air', room, 'pressure', e.target.value)} className={`w-12 p-2 rounded-xl border-2 font-black ${data.pressure < 14 ? 'border-rose-500' : ''}`} /></td>
                                <td className="p-6 font-sans"><div className="flex gap-1 flex-wrap">{['เรียบร้อย', 'ควรซ่อม', 'ควรเปลี่ยน'].map(s => <button key={s} onClick={() => handleUpdatePlan('air', room, 'cleanStatus', s)} className={`px-2 py-1 rounded-full border text-[8px] font-black ${data.cleanStatus===s ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>{s}</button>)}</div></td>
                                <td className="p-6 font-sans"><textarea value={data.note || ""} onChange={e => handleUpdatePlan('air', room, 'note', e.target.value)} className="w-full p-2 bg-slate-50 rounded-xl text-[10px] min-h-[50px] outline-none" /></td>
                                <td className="p-6 text-center font-sans"><button onClick={() => handleUpdatePlan('air', room, 'done', !data.done)} className={`p-4 rounded-2xl ${data.done ? 'bg-emerald-500 text-white' : 'bg-slate-100'}`}><CheckCircle2/></button></td>
                             </tr>
                          )
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        ) : viewMode === 'wmPlanner' ? (
           /* --- WM SERVICE FULL REPORT --- */
           <div className="bg-white rounded-[4rem] border p-12 max-w-4xl mx-auto shadow-2xl font-sans">
              <div className="bg-indigo-600 p-10 text-white flex justify-between items-center rounded-t-[3rem] font-sans">
                 <h2 className="text-2xl font-black italic uppercase">Washing Machine Service Report</h2>
              </div>
              {(() => {
                 const data = wmPlans[`${activePropertyId}_COMMON`] || {};
                 return (
                    <div className={`p-12 border-x-4 border-b-4 rounded-b-[3.5rem] space-y-10 font-sans ${data.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                       <div className="grid grid-cols-2 gap-8 font-sans">
                          <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">วันที่ล้างจริง</p><input type="date" value={data.date || ""} onChange={e => handleUpdatePlan('wm', 'COMMON', 'date', e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none font-sans" /></div>
                          <div className="space-y-2 font-sans"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">รอบโครงการ</p><select value={data.cycle || ""} onChange={e => handleUpdatePlan('wm', 'COMMON', 'cycle', e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none font-sans"><option value="">เลือก</option><option value="1">ม.ค.-มิ.ย.</option><option value="2">ก.ค.-ธ.ค.</option></select></div>
                       </div>
                       <button onClick={() => handleUpdatePlan('wm', 'COMMON', 'done', !data.done)} className={`w-full py-10 rounded-[2.5rem] font-black text-xl uppercase font-sans ${data.done ? 'bg-emerald-200 text-emerald-700 shadow-none' : 'bg-slate-900 text-white shadow-2xl'}`}>{data.done ? 'บันทึกเรียบร้อย' : 'ยืนยันจบงานล้าง (เหมาตึก)'}</button>
                    </div>
                 )
              })()}
           </div>
        ) : (
           /* --- ROOM GRID VIEW (MAIN) --- */
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4 font-sans">
                 <UserCheck size={24} className="text-indigo-600" />
                 <input value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="ระบุชื่อผู้บันทึกงาน..." className="w-full font-black text-sm outline-none bg-transparent font-sans" />
              </div>

              {userRole === 'engineer' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                    <div className="bg-amber-500 p-6 rounded-[2.5rem] text-white shadow-lg space-y-2 font-sans">
                       <h4 className="font-black text-[10px] flex items-center gap-2 uppercase font-sans"><Hammer size={16}/> งานซ่อมรออยู่</h4>
                       {missions.repair.map(m => <div key={m} className="bg-white/20 p-2 rounded-xl font-black text-sm">ห้อง {m}</div>)}
                       {missions.repair.length===0 && <p className="text-[10px] italic opacity-60 font-sans">ไม่มีงานซ่อม</p>}
                    </div>
                    <div className="bg-sky-500 p-6 rounded-[2.5rem] text-white shadow-lg space-y-2 font-sans">
                       <h4 className="font-black text-[10px] flex items-center gap-2 uppercase font-sans"><Wind size={16}/> คิวล้างแอร์วันนี้</h4>
                       {missions.air.map(m => <div key={m} className="bg-white/20 p-2 rounded-xl font-black text-sm">ห้อง {m}</div>)}
                       {missions.air.length===0 && <p className="text-[10px] italic opacity-60 font-sans">ไม่มีคิวล้างแอร์</p>}
                    </div>
                    <div className={`p-6 rounded-[2.5rem] text-white shadow-lg text-center flex flex-col justify-center items-center ${missions.wm ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'} font-sans`}>
                       <WashingMachine size={24}/><p className="font-black text-[10px] mt-1 uppercase font-sans">{missions.wm ? 'ถึงรอบล้างเครื่อง' : 'เครื่องซักผ้าปกติ'}</p>
                    </div>
                 </div>
              )}

              {activeProperty?.floors.map(floor => (
                <div key={floor.level} className="space-y-4 font-sans">
                   <h3 className="font-black text-slate-400 text-[10px] uppercase pl-2 tracking-widest font-bold font-sans">ชั้น {floor.level}</h3>
                   <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3 font-sans">
                      {floor.rooms.map(roomNo => {
                        const info = roomStates[`${activePropertyId}_${roomNo}`] || { status: 'rented' };
                        const isHidden = userRole==='sales' && !['ready', 'rented', 'booked'].includes(info.status);
                        return (
                          <button key={roomNo} onClick={() => setSelectedRoom(roomNo)} className={`p-5 rounded-[2rem] font-black text-center shadow-sm border-b-4 border-black/10 transition-all font-sans ${STEPS[info.status]?.color || 'bg-slate-300'} text-white ${isHidden ? 'opacity-20' : 'active:scale-95'}`}>
                            <div className="text-lg leading-none font-sans">{roomNo}</div>
                            <div className="text-[7px] uppercase opacity-70 mt-1 font-sans">{STEPS[info.status]?.label}</div>
                            {info.moveOutDate && info.status === 'keyReturn' && <div className="text-[6px] mt-1 bg-white/20 rounded p-0.5 font-sans font-sans">{info.moveOutDate}</div>}
                          </button>
                        );
                      })}
                   </div>
                </div>
              ))}
           </div>
        )}
      </main>

      {/* --- MODAL ENGINE (HARD-CODED EVERY SECTION FOR ACCURACY) --- */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
           <div className="bg-white rounded-[3rem] w-full max-w-xl max-h-[85vh] overflow-y-auto p-10 shadow-2xl relative font-sans">
              <div className="flex justify-between items-center mb-10 font-sans">
                 <div><h3 className="text-3xl font-black text-indigo-600 font-sans">ห้อง {selectedRoom}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest font-sans">{activeProperty.name}</p></div>
                 <div className="flex gap-2 font-sans">
                    <button onClick={() => setShowLogbook(!showLogbook)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm font-sans ${showLogbook ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                       {showLogbook ? <><Activity size={14} className="inline mr-1 font-sans"/> Workflow</> : <><BookOpen size={14} className="inline mr-1 font-sans"/> Tech Logbook</>}
                    </button>
                    <button onClick={() => setSelectedRoom(null)}><X size={32}/></button>
                 </div>
              </div>

              {showLogbook ? (
                /* --- TECHNICAL SPEC & HISTORY LOG --- */
                <div className="space-y-8 animate-in slide-in-from-bottom-2 font-sans">
                   <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden font-sans">
                      <h4 className="text-xs font-black text-indigo-400 uppercase flex items-center gap-2 font-sans"><Info size={16}/> ห้องนี้สเปคอะไร?</h4>
                      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.target); setDoc(doc(db, 'apartments', appId, 'roomSpecs', `${activePropertyId}_${selectedRoom}`), { airSpec: f.get('air'), lightSpec: f.get('light'), faucetSpec: f.get('faucet'), chronicIssue: f.get('chronic'), lastUpdate: new Date().toLocaleString('th-TH') }); alert("บันทึกสเปคแล้ว!"); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans">
                         <div className="space-y-1 font-sans"><p className="text-[8px] font-black opacity-60 font-sans">แอร์ (BTU/รุ่น)</p><input name="air" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.airSpec} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs font-sans" /></div>
                         <div className="space-y-1 font-sans"><p className="text-[8px] font-black opacity-60 font-sans">ไฟ (ขั้ว/วัตต์)</p><input name="light" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.lightSpec} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs font-sans" /></div>
                         <div className="space-y-1 md:col-span-2 font-sans"><p className="text-[8px] font-black text-rose-400 font-sans">🚨 แจ้งปัญหาซ้ำซาก</p><input name="chronic" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.chronicIssue} className="w-full p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 font-sans" /></div>
                         <button type="submit" className="md:col-span-2 w-full bg-indigo-600 py-3 rounded-xl font-black text-xs uppercase font-sans"><Save size={14} className="inline mr-2 font-sans"/> Save Tech Specs</button>
                      </form>
                      <Wrench size={180} className="absolute -right-20 -bottom-20 opacity-10 rotate-12" />
                   </div>
                   <div className="space-y-2 font-sans">
                      <h4 className="font-black text-xs flex items-center gap-2 text-slate-400 font-sans"><History size={16}/> ประวัติการแจ้งซ่อมในอดีต</h4>
                      {logHistory.map((log, i) => (
                         <div key={i} className="p-4 bg-white border-2 border-slate-50 rounded-2xl flex justify-between items-center shadow-sm font-sans">
                            <div className="font-sans"><p className="font-black text-xs text-slate-700 font-sans">{log.action}</p><p className="text-[9px] text-slate-400 font-bold font-sans">{log.details}</p></div>
                            <div className="text-right text-[9px] font-black text-indigo-500 font-sans">{log.displayTime}</div>
                         </div>
                      ))}
                   </div>
                </div>
              ) : (
                /* --- SOP WORKFLOW ENGINES (HARD-CODED SECTIONS) --- */
                <form id="modalForm" className="space-y-6 font-sans">
                   {(() => {
                      const info = roomStates[`${activePropertyId}_${selectedRoom}`] || { status: 'rented' };
                      const cur = info.status;

                      // SALES MODE VIEW
                      if (userRole === 'sales') return (
                         <div className="space-y-6 font-sans">
                            <div className="bg-indigo-50 p-6 rounded-[2.5rem] border-2 border-indigo-100 font-sans">
                               <h4 className="font-black text-indigo-600 uppercase text-xs mb-4 flex items-center gap-2"><ShoppingBag size={18}/> ข้อมูลการเตรียมขาย</h4>
                               <div className="space-y-2 font-sans">
                                  <p className="text-sm font-bold text-slate-600 font-sans">แอร์: {roomSpecs[`${activePropertyId}_${selectedRoom}`]?.airSpec || 'ไม่ได้ระบุ'}</p>
                                  <p className="text-sm font-bold text-rose-500 italic font-sans">⚠️ ปัญหาที่พบ: {roomSpecs[`${activePropertyId}_${selectedRoom}`]?.chronicIssue || 'ปกติ'}</p>
                               </div>
                            </div>
                            {cur === 'ready' && <button type="button" onClick={() => handleUpdateRoom('booked')} className="w-full bg-purple-600 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl font-sans">จองห้องนี้</button>}
                            {cur === 'booked' && <div className="text-center p-10 font-black text-purple-600 font-sans">จองแล้ว รอลูกค้าเซ็นสัญญา</div>}
                         </div>
                      );

                      // ENGINEER: RENTED -> KEY RETURN (แจ้งย้าย)
                      if (cur === 'rented') return (
                         <div className="space-y-6 font-sans">
                            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 space-y-4 font-sans text-slate-800">
                               <div className="grid grid-cols-2 gap-4 font-sans">
                                  <div className="space-y-2 font-sans"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">ชื่อลูกค้า</p><input name="tName" className="w-full p-4 bg-white border rounded-2xl font-bold text-sm font-sans" /></div>
                                  <div className="space-y-2 font-sans"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans">เบอร์ติดต่อ</p><input name="tPhone" className="w-full p-4 bg-white border rounded-2xl font-bold text-sm font-sans" /></div>
                               </div>
                               <div className="space-y-2 font-sans">
                                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-sans">🗓️ วันที่ลูกค้ากำหนดออก (Move-out Date)</p>
                                  <input name="moveOutDate" type="date" className="w-full p-5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-indigo-600 text-lg font-sans" />
                               </div>
                            </div>
                            <button type="button" onClick={() => handleUpdateRoom('keyReturn')} className="w-full bg-indigo-600 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl font-sans">ยืนยันแจ้งย้าย</button>
                         </div>
                      );

                      // ENGINEER: PENDING CHECK (กางรายการ 6 หมวดเต็มแบบ Hard-coded)
                      if (cur === 'pendingCheck') return (
                         <div className="space-y-8 font-sans">
                            <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2 font-sans"><ClipboardCheck size={16}/> ตรวจคืนประกัน (หักเงินตามจริง)</p>
                            
                            {/* หมวดเฟอร์ */}
                            <div className="space-y-3 font-sans">
                               <p className="text-[9px] font-black text-slate-400 bg-slate-50 p-2 rounded-lg font-sans">1. หมวดเฟอร์นิเจอร์และเครื่องใช้ในห้อง</p>
                               {["กระจกโต๊ะเครื่องแป้ง", "โต๊ะวางทีวี", "ตู้เสื้อผ้า", "เตียงที่นอน", "เก้าอี้พักผ่อน"].map(it => (
                                 <div key={it} className="bg-white p-4 border rounded-2xl font-sans">
                                   <label className="flex items-center gap-3 font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-rose-500 font-sans" onChange={e => setRepairs({...repairs, [it]: {checked: e.target.checked}})} /> {it}</label>
                                   {repairs[it]?.checked && <div className="mt-2 flex gap-2 font-sans"><input placeholder="ค่าปรับ" className="w-20 p-2 border rounded-xl text-xs font-black font-sans" onChange={e=>setRepairs({...repairs,[it]:{...repairs[it],price:e.target.value}})}/><input placeholder="ระบุอาการ..." className="flex-1 p-2 border rounded-xl text-xs font-sans" onChange={e=>setRepairs({...repairs,[it]:{...repairs[it],note:e.target.value}})}/></div>}
                                 </div>
                               ))}
                            </div>

                            {/* หมวดห้องน้ำ */}
                            <div className="space-y-3 font-sans">
                               <p className="text-[9px] font-black text-slate-400 bg-slate-50 p-2 rounded-lg font-sans">2. หมวดอุปกรณ์ห้องน้ำและสุขภัณฑ์</p>
                               {["ก๊อกอ่างล้างหน้า", "ชุดฝักบัว/สายชำระ", "อ่างล้างหน้า/สะดือ", "ชักโครก/ฝารองนั่ง", "ประตู PVC"].map(it => (
                                 <div key={it} className="bg-white p-4 border rounded-2xl font-sans">
                                   <label className="flex items-center gap-3 font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-rose-500 font-sans" onChange={e => setRepairs({...repairs, [it]: {checked: e.target.checked}})} /> {it}</label>
                                   {repairs[it]?.checked && <div className="mt-2 flex gap-2 font-sans"><input placeholder="ราคา" className="w-20 p-2 border rounded-xl text-xs font-black font-sans" onChange={e=>setRepairs({...repairs,[it]:{...repairs[it],price:e.target.value}})}/><input placeholder="โน้ต..." className="flex-1 p-2 border rounded-xl text-xs font-sans" onChange={e=>setRepairs({...repairs,[it]:{...repairs[it],note:e.target.value}})}/></div>}
                                 </div>
                               ))}
                            </div>

                            {/* หมวดไฟฟ้าและแอร์ */}
                            <div className="space-y-3 font-sans">
                               <p className="text-[9px] font-black text-slate-400 bg-slate-50 p-2 rounded-lg font-sans">3. หมวดไฟฟ้าและเครื่องปรับอากาศ</p>
                               {["ความเย็นแอร์", "รีโมทแอร์", "หลอดไฟ/ปลั๊ก", "กุญแจ/คีย์การ์ด", "มุ้งลวด/เหล็กดัด"].map(it => (
                                 <div key={it} className="bg-white p-4 border rounded-2xl font-sans">
                                   <label className="flex items-center gap-3 font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-rose-500 font-sans" onChange={e => setRepairs({...repairs, [it]: {checked: e.target.checked}})} /> {it}</label>
                                   {repairs[it]?.checked && <div className="mt-2 flex gap-2 font-sans"><input placeholder="หักเงิน" className="w-20 p-2 border rounded-xl text-xs font-black font-sans" onChange={e=>setRepairs({...repairs,[it]:{...repairs[it],price:e.target.value}})}/><input placeholder="ข้อมูล..." className="flex-1 p-2 border rounded-xl text-xs font-sans" onChange={e=>setRepairs({...repairs,[it]:{...repairs[it],note:e.target.value}})}/></div>}
                                 </div>
                               ))}
                            </div>

                            <button type="button" onClick={() => handleUpdateRoom('cleaningPre')} className="w-full bg-indigo-600 text-white py-8 rounded-3xl font-black text-xl uppercase font-sans">ยืนยันผลตรวจ (ส่งงานต่อ)</button>
                         </div>
                      );

                      // ENGINEER: MAINTENANCE (หน้าช่างซ่อม)
                      if (cur === 'maintenance') return (
                         <div className="space-y-6 font-sans">
                            <div className="bg-amber-50 p-10 rounded-[3rem] border-2 border-amber-200 font-sans">
                               <h4 className="font-black text-amber-600 uppercase text-xs mb-6 flex items-center gap-2 font-sans"><Wrench size={18}/> รายการที่ต้องดำเนินการซ่อม</h4>
                               {Object.entries(info.repairData || {}).map(([k,v]) => v.checked && (
                                  <div key={k} className="p-5 bg-white border-2 border-slate-50 rounded-3xl flex justify-between items-center mb-3 font-sans">
                                     <div className="font-sans"><p className="font-black text-sm font-sans">{k}</p><p className="text-[11px] text-amber-500 font-bold italic mt-2 bg-amber-50 p-2 rounded-xl inline-block font-sans">📌 รายละเอียด: {v.note || '-'}</p></div>
                                     <Camera className="text-slate-300" size={24}/>
                                  </div>
                               ))}
                            </div>
                            <button type="button" onClick={() => handleUpdateRoom('cleaningPost')} className="w-full bg-slate-900 text-white py-8 rounded-[2.5rem] font-black text-xl shadow-lg uppercase font-sans">Engineer: ซ่อมเสร็จสมบูรณ์</button>
                         </div>
                      );

                      // ENGINEER: FINAL QC (กางรายการตรวจสอบ)
                      if (cur === 'finalQC') return (
                         <div className="space-y-6 font-sans">
                            <p className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-2 font-sans"><ShieldCheck size={16}/> QC CHECKLIST ก่อนเปิดขาย</p>
                            <label className="flex items-center gap-4 bg-white p-5 border rounded-2xl cursor-pointer font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-emerald-500 font-sans" onChange={e => setQcChecks({...qcChecks, f1: e.target.checked})} /> ระบบไฟฟ้าและแสงสว่างพร้อม</label>
                            <label className="flex items-center gap-4 bg-white p-5 border rounded-2xl cursor-pointer font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-emerald-500 font-sans" onChange={e => setQcChecks({...qcChecks, f2: e.target.checked})} /> ระบบประปาและสุขภัณฑ์ไม่มีจุดรั่ว</label>
                            <label className="flex items-center gap-4 bg-white p-5 border rounded-2xl cursor-pointer font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-emerald-500 font-sans" onChange={e => setQcChecks({...qcChecks, f3: e.target.checked})} /> เครื่องปรับอากาศล้างและเย็นปกติ</label>
                            <label className="flex items-center gap-4 bg-white p-5 border rounded-2xl cursor-pointer font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-emerald-500 font-sans" onChange={e => setQcChecks({...qcChecks, f4: e.target.checked})} /> เฟอร์นิเจอร์สะอาดและไม่ชำรุด</label>
                            <label className="flex items-center gap-4 bg-white p-5 border rounded-2xl cursor-pointer font-bold text-xs font-sans"><input type="checkbox" className="w-5 h-5 accent-emerald-500 font-sans" onChange={e => setQcChecks({...qcChecks, f5: e.target.checked})} /> พื้นห้องและห้องน้ำแห้งสะอาด</label>
                            <button type="button" onClick={() => handleUpdateRoom('ready')} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl uppercase font-sans">ผ่านการตรวจสอบ (Ready to Rent)</button>
                         </div>
                      );

                      return <button type="button" onClick={() => handleUpdateRoom(STEPS[cur].next)} className="w-full bg-slate-900 text-white py-12 rounded-[2.5rem] font-black text-2xl uppercase font-sans">{STEPS[cur].label} → ถัดไป</button>;
                   })()}
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
}