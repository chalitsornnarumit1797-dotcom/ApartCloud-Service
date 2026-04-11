import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Building2, X, Clock, Wrench, ClipboardCheck, Lock, Unlock, User, CheckCircle2, Key, Archive, LayoutGrid, UserCheck, Sparkles, Wind, Tablet as WashingMachine, Calendar, AlertTriangle, Settings, Camera, Phone, BookOpen, History, Save, Info, Bell, Hammer, Activity, ShieldCheck, Tag, ShoppingBag, BarChart3, ShoppingCart, ChevronRight, Monitor } from 'lucide-react';

// --- Firebase Config (ใช้ค่าเดิมของคุณ) ---
const ACCESS_PIN = "933979"; // สำหรับ Engineer Mode
const SALES_PIN = "111111"; // สำหรับ Sales Mode
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

// --- Configuration ---
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

// --- Checklist ตรวจคืนประกัน (28 ข้อ ตามสั่งนายเป๊ะๆ) ---
const CHECKLIST_OUT = {
  "1.หมวดกุญแจและระบบล็อค": [
    "กุญแจ (ลูกกุญแจ) / คีย์การ์ดหาย",
    "ลูกบิดประตู / งัดประตู / งัดกุญแจเสียหาย",
    "ลืมกุญแจ (กรณีต้องเปิดให้)"
  ],
  "2.หมวดประตู-หน้าต่าง-มุ้งลวด": [
    "ประตูไม้ / วงกบประตู",
    "ประตู PVC ห้องน้ำ",
    "ประตูมุ้งลวด / มุ้งลวด",
    "กระจกบานเกล็ดห้องน้ำ"
  ],
  "3.หมวดผนังและสี": [
    "ทาสีเป็นจุด / ทาสีทั้งผนัง",
    "รอยตอกตะปู / เทปกาว 2 หน้า"
  ],
  "4.หมวดไฟฟ้าและแอร์": [
    "หลอดไฟ",
    "เครื่องปรับอากาศ / รีโมทแอร์"
  ],
  "5.หมวดสุขภัณฑ์และประปา": [
    "ก๊อกน้ำ / ฝักบัว",
    "อ่างล้างหน้า / กระจกในห้องน้ำ",
    "ชักโครกแตก / ท่อตัน",
    "คราบดำในห้องน้ำ (ทำความสะอาดหนัก)"
  ],
  "6.หมวดเฟอร์นิเจอร์และพื้น": [
    "กระจกโต๊ะเครื่องแป้ง / กระจกตู้เสื้อผ้า",
    "ตู้ / เตียง / โต๊ะเครื่องแป้ง",
    "กระเบื้องในห้องน้ำ / กระเบื้องแกรนิตโต้"
  ]
};

// --- Checklist Final QC (ยกเครื่องใหม่ 6 หมวดตามสั่งนาย) ---
const CHECKLIST_QC = {
  "1.หมวดประตู-หน้าต่าง": [
    "กลอนและกุญแจ (ล็อค-ปลดล็อคไม่ติดขัด)",
    "บานพับ (เปิด-ปิดสุดต้องไม่มีเสียง/ไม่ตกเบียด)",
    "หน้าต่าง (ปิดสนิทฉีดน้ำทดสอบต้องไม่ซึม)",
    "ช่องว่าง (ขอบประตู/หน้าต่างแนบสนิทผนัง)"
  ],
  "2.หมวดระบบไฟฟ้า": [
    "แสงสว่าง (เปิด-ปิดไฟติดครบทุกดวง/ไม่กระพริบ)",
    "เต้ารับ (ทดสอบมีไฟเข้าทุกลูก)",
    "เครื่องปรับอากาศ (เย็นฉ่ำ/ไม่มีน้ำหยด)",
    "ตู้ไฟควบคุม (ปุ่ม Test ตัดไฟปกติ/มีป้ายบอกจุดคุม)"
  ],
  "3.หมวดพื้นและผนัง": [
    "พื้นกระเบื้อง (เคาะแล้วเสียงไม่กลวง)",
    "ความลาดเอียง (ราดน้ำแล้วไหลลงท่อ/ไม่ขัง)",
    "ยาแนวพื้นและผนัง (เต็ม เรียบ ไม่สากมือ)",
    "ผนังและสี (ผิวเรียบ/ไม่มีรอยร้าว/สีด่าง)"
  ],
  "4.หมวดเฟอร์นิเจอร์": [
    "ตู้เสื้อผ้า/ลิ้นชัก (ลื่นไหล/ปิดสนิท)",
    "บานพับและมือจับ (ยึดแน่นไม่โอนเอน)",
    "เตียงนอน (ไม่มีเสียง/ไม่มีเสี้ยนคม)",
    "โต๊ะและเก้าอี้ (ไม่กระดก/ผิวไม่พอง)",
    "ผ้าม่าน (รูดลื่น/ไม่มีรอยขาด/ราวยึดแน่น)",
    "ฟูกที่นอน (ไม่มีรอยเปื้อน/ไม่ยุบตัว)"
  ],
  "5.หมวดระบบสุขาภิบาล": [
    "ชักโครก (กด 3-4 รอบต้องลงเร็ว/ไม่รั่วที่ฐาน)",
    "ยาแนวสุขภัณฑ์ (ฐานชักโครก/อ่างปิดสนิท)",
    "ก๊อกน้ำ/ฝักบัว (ไหลแรง/ปิดสนิทไม่หยด)",
    "ท่อน้ำทิ้ง (ระบายเร็ว/ไม่มีกลิ่นย้อน)",
    "ฝ้าเพดานห้องน้ำ (ไม่มีรอยด่างซึมจากชั้นบน)"
  ],
  "6.หมวดระเบียง": [
    "ราวกันตก (แน่นหนา/ไม่โยกเยก)",
    "ก๊อกซักล้าง (น้ำไหลลงท่อระเบียงได้ดี)"
  ]
};

const WM_CHECKLIST = ["ถังซักสะอาด", "หยอดเหรียญปกติ", "ท่อน้ำปกติ", "เสียงเครื่องปกติ", "ปั่นแห้งปกติ", "ฝาปิดปกติ"];

const PROPERTIES = [
  { id: 'mangmee', name: 'บ้านมั่งมีทวีสุข', floors: [7,6,5,4,3,2].map(l => ({ level: l, rooms: Array.from({ length: 18 }, (_, i) => `${l}${String(i + 1).padStart(2, '0')}`) })) },
  { id: 'mytree', name: 'บ้านมายทรี 48', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: l===1 ? Array.from({length:11},(_,i)=>`1${String(i+1).padStart(2,'0')}`) : ['01','02','03','05','06','07','08','09','10','11','12','13','14','15'].map(r => `${l}${r}`) })) },
  { id: 'khunluang', name: 'บ้านคุณหลวง', floors: [4,3,2,1].map(l => ({ level: l, rooms: Array.from({ length: l===4?6:l===1?18:12 }, (_, i) => `${l}-${i + 1}`) })) },
  { id: 'meesap', name: 'อพาร์ทเม้นท์มีทรัพย์', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: Array.from({ length: 6 }, (_, j) => `${l}.${j + 1}`) })) },
  { id: 'meethong', name: 'อพาร์ทเม้นท์มีทอง', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: l === 1 ? Array.from({ length: 11 }, (_, j) => `${102 + j}`) : Array.from({ length: 13 }, (_, j) => `${l}${String(j + 1).padStart(2, '0')}`) })) }
];

export default function App() {
  const [userRole, setUserRole] = useState(null); // 'engineer' | 'sales'
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

  useEffect(() => {
    if (selectedRoom && showLogbook) {
      const q = query(collection(db, 'apartments', appId, 'logs'), where('roomKey', '==', `${activePropertyId}_${selectedRoom}`), orderBy('timestamp', 'desc'), limit(15));
      onSnapshot(q, (snap) => {
        const logs = []; snap.forEach(d => logs.push(d.data()));
        setLogHistory(logs);
      });
    }
  }, [selectedRoom, showLogbook]);

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

  const handleUpdateRoom = async (nextStep) => {
    if (!workerName) return alert("ระบุชื่อผู้บันทึก!");
    const docId = `${activePropertyId}_${selectedRoom}`;
    const timestamp = new Date().toLocaleString('th-TH');
    const info = roomStates[docId] || { status: 'rented' };
    
    let updateData = { ...info, status: nextStep, lastUpdateBy: workerName, lastUpdateTime: timestamp, propertyId: activePropertyId };
    
    if (info.status === 'rented') {
      const form = document.getElementById('modalForm');
      const formData = new FormData(form);
      updateData.tenantName = formData.get('tName'); 
      updateData.tenantPhone = formData.get('tPhone'); 
      // --- เพิ่มบรรทัดนี้เข้าไป ---
      updateData.checkoutDate = formData.get('checkoutDate'); 
    }

    if (info.status === 'pendingCheck') updateData.repairData = repairs;
    if (info.status === 'finalQC') updateData.qcData = qcChecks;

    if (info.status === 'maintenance' && nextStep === 'cleaningPost') {
      await addDoc(collection(db, 'apartments', appId, 'logs'), { 
        roomKey: docId, action: "ซ่อมเสร็จเรียบร้อย", worker: workerName, timestamp: Date.now(), displayTime: timestamp, 
        details: Object.keys(info.repairData || {}).join(', ') 
      });
    }

    if (nextStep === 'ready') { delete updateData.repairData; delete updateData.qcData; delete updateData.tenantName; }
    
    await setDoc(doc(db, 'apartments', appId, 'rooms', docId), updateData);
    setSelectedRoom(null); setRepairs({}); setQcChecks({});
  };

  const handleUpdatePlan = async (type, id, field, value) => {
    if (!workerName) return alert("ระบุชื่อผู้บันทึก!");
    const col = type === 'air' ? 'airPlans' : 'wmPlans';
    const docId = `${activePropertyId}_${id}`;
    const cur = (type === 'air' ? airPlans : wmPlans)[docId] || {};
    await setDoc(doc(db, 'apartments', appId, col, docId), { ...cur, [field]: value, updateBy: workerName, updatedAt: new Date().toLocaleString('th-TH'), propertyId: activePropertyId });
  };

  const saveTechnicalLog = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await setDoc(doc(db, 'apartments', appId, 'roomSpecs', `${activePropertyId}_${selectedRoom}`), { 
      airSpec: formData.get('air'), 
      lightSpec: formData.get('light'), 
      faucetSpec: formData.get('faucet'), 
      chronicIssue: formData.get('chronic'),
      // --- วางเพิ่มตรงนี้ (ล่าง chronic) ---
      price: formData.get('price'), 
      furnitures: formData.get('furnitures'),
      photoUrl: formData.get('photoUrl'),
      // -------------------------------
      lastUpdate: new Date().toLocaleString('th-TH')
    });
    alert("บันทึกข้อมูล Master เรียบร้อย!");
  };

  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans">
        <form onSubmit={(e) => { e.preventDefault(); if (pinInput===ACCESS_PIN) setUserRole('engineer'); else if (pinInput===SALES_PIN) setUserRole('sales'); else alert('PIN ผิด'); setPinInput(""); }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center space-y-6">
          <Building2 size={48} className="mx-auto text-indigo-600" />
          <h2 className="text-xl font-black italic uppercase text-slate-800">System Login</h2>
          <div className="space-y-2">
            <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl text-center text-4xl font-bold border-2 outline-none" placeholder="PIN" />
            <div className="flex justify-between px-2 text-[8px] font-black uppercase text-slate-400">
                <span>Engineer: 933979</span>
                <span>Sales: 111111</span>
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase">Enter System</button>
        </form>
      </div>
    );
  }

  const activeProperty = PROPERTIES.find(p => p.id === activePropertyId);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
      <nav className="bg-white border-b p-4 sticky top-0 z-40 flex flex-wrap justify-between items-center px-6 shadow-sm gap-4">
        <div className="font-black text-indigo-600 flex items-center gap-2 text-xl italic font-sans">
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
        <div className="flex overflow-x-auto gap-2 no-scrollbar pb-2">
          {PROPERTIES.map(p => (
            <button key={p.id} onClick={() => setActivePropertyId(p.id)} className={`px-6 py-3 rounded-2xl border-2 font-black whitespace-nowrap transition-all ${activePropertyId === p.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{p.name}</button>
          ))}
        </div>

        {viewMode === 'summary' ? (
           <div className="space-y-6 animate-in fade-in font-sans">
              {/* 🟢 หมวด: ห้องพร้อมขาย (ปิดงานได้ทันที) */}
              <div className="bg-emerald-500 p-6 rounded-[2.5rem] text-white shadow-lg">
                 <h4 className="font-black text-xs uppercase flex items-center gap-2 mb-4"><Tag size={18}/> ห้องว่างพร้อมขาย (Ready to Move)</h4>
                 <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'ready').map(([k,v]) => (
                       <div key={k} className="bg-white/20 p-4 rounded-2xl text-center font-black text-xl italic">
                          {k.split('_')[1]}
                       </div>
                    ))}
                    {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'ready').length === 0 && (
                       <p className="col-span-full text-center text-[10px] opacity-70 py-4 font-bold font-sans">--- ไม่มีห้องว่างในขณะนี้ ---</p>
                    )}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* 🟠 หมวด: กำลังรอซ่อม/ทำความสะอาด (แจ้งลูกค้าให้รอก่อนได้) */}
                 <div className="bg-amber-500 p-6 rounded-[2.5rem] text-white shadow-lg">
                    <h4 className="font-black text-xs uppercase flex items-center gap-2 mb-4 font-sans"><Wrench size={18}/> อยู่ระหว่างเตรียมห้อง (Maintenance/Cleaning)</h4>
                    <div className="space-y-3">
                       {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && ['maintenance', 'cleaningPre', 'cleaningPost'].includes(v.status)).map(([k,v]) => (
                          <div key={k} className="bg-white/10 p-4 rounded-2xl flex justify-between items-center">
                             <span className="font-black text-lg">ห้อง {k.split('_')[1]}</span>
                             <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase">{STEPS[v.status].label}</span>
                          </div>
                       ))}
                    </div>
                 </div>

                 {/* 🔴 หมวด: ลูกค้าแจ้งย้าย (ห้องจะว่างในอนาคต) */}
                 <div className="bg-rose-500 p-6 rounded-[2.5rem] text-white shadow-lg font-sans">
                    <h4 className="font-black text-xs uppercase flex items-center gap-2 mb-4 font-sans"><Calendar size={18}/> ห้องที่มีการแจ้งย้ายออก (Upcoming Vacant)</h4>
                    <div className="space-y-3 font-sans">
                       {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'keyReturn').map(([k,v]) => (
                          <div key={k} className="bg-white/10 p-4 rounded-2xl flex justify-between items-center font-sans">
                             <div className="font-sans">
                                <p className="font-black text-lg font-sans">ห้อง {k.split('_')[1]}</p>
                                <p className="text-[10px] opacity-80 font-bold font-sans">📅 ว่างวันที่: {v.checkoutDate || 'ยังไม่ระบุ'}</p>
                             </div>
                             <span className="bg-white/20 px-3 py-1 rounded-full text-[9px] font-black uppercase font-sans">รอคืนกุญแจ</span>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>

              {/* 🟣 หมวด: ห้องที่จองแล้ว */}
              <div className="bg-purple-600 p-6 rounded-[2.5rem] text-white shadow-lg">
                 <h4 className="font-black text-xs uppercase flex items-center gap-2 mb-4 font-sans"><ShoppingBag size={18}/> รายการห้องที่จองแล้ว (Booked)</h4>
                 <div className="flex flex-wrap gap-2">
                    {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'booked').map(([k,v]) => (
                       <span key={k} className="bg-white/20 px-6 py-2 rounded-xl font-black text-sm italic font-sans">{k.split('_')[1]}</span>
                    ))}
                 </div>
              </div>
           </div>
        ) : viewMode === 'airPlanner' ? (
           /* --- 🌪️ ตารางแผนแอร์ --- */
           <div className="bg-white rounded-[3rem] border shadow-2xl overflow-hidden font-sans">
              <div className="bg-sky-500 p-8 text-white flex justify-between items-center"><h2 className="text-2xl font-black italic uppercase font-sans">Air Planner</h2></div>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-[11px] font-sans">
                    <thead className="bg-slate-50 font-black text-slate-400 uppercase border-b">
                       <tr><th className="p-6">ลำดับ</th><th className="p-6">ห้อง</th><th className="p-6">วัน/เวลา</th><th className="p-6">การเข้า</th><th className="p-6">น้ำยา(≥14)</th><th className="p-6">สถานะ</th><th className="p-6">โน้ต</th><th className="p-6 text-center">จบงาน</th></tr>
                    </thead>
                    <tbody>
                       {activeProperty.floors.flatMap(f => f.rooms).map((room, idx) => {
                          const data = airPlans[`${activePropertyId}_${room}`] || {};
                          return (
                             <tr key={room} className={`border-b ${data.done ? 'opacity-30 grayscale' : ''}`}>
                                <td className="p-6 font-black text-slate-300 font-sans">{idx+1}</td>
                                <td className="p-6 font-black text-xl font-sans">{room}</td>
                                <td className="p-6 space-y-1 font-sans"><input type="date" value={data.date || ""} onChange={e => handleUpdatePlan('air', room, 'date', e.target.value)} className="block outline-none" /><input type="time" value={data.time || ""} onChange={e => handleUpdatePlan('air', room, 'time', e.target.value)} className="block text-sky-600 font-black outline-none" /></td>
                                <td className="p-6 font-sans"><select value={data.access || ""} onChange={e => handleUpdatePlan('air', room, 'access', e.target.value)} className="p-2 bg-slate-100 rounded-xl font-black text-[9px] outline-none font-sans font-sans"><option value="">เลือก</option><option value="allow">อนุญาตให้เปิด</option><option value="knock">ให้เคาะก่อน</option><option value="deny">ไม่อนุญาต</option></select></td>
                                <td className="p-6 font-sans font-sans"><input type="number" value={data.pressure || ""} onChange={e => handleUpdatePlan('air', room, 'pressure', e.target.value)} className={`w-12 p-2 rounded-xl border-2 font-black ${data.pressure < 14 ? 'border-rose-500' : ''}`} /></td>
                                <td className="p-6 font-sans font-sans"><div className="flex gap-1 flex-wrap font-sans">{['เรียบร้อย', 'ควรซ่อม', 'ควรเปลี่ยน'].map(s => <button key={s} onClick={() => handleUpdatePlan('air', room, 'cleanStatus', s)} className={`px-2 py-1 rounded-full border text-[8px] font-black font-sans ${data.cleanStatus===s ? 'bg-slate-900 text-white' : 'bg-white text-slate-400'}`}>{s}</button>)}</div></td>
                                <td className="p-6 font-sans font-sans"><textarea value={data.note || ""} onChange={e => handleUpdatePlan('air', room, 'note', e.target.value)} className="w-full p-2 bg-slate-50 rounded-xl text-[10px] min-h-[50px] outline-none font-sans" /></td>
                                <td className="p-6 text-center font-sans font-sans"><button onClick={() => handleUpdatePlan('air', room, 'done', !data.done)} className={`p-4 rounded-2xl ${data.done ? 'bg-emerald-500 text-white font-sans' : 'bg-slate-100'}`}><CheckCircle2/></button></td>
                             </tr>
                          )
                       })}
                    </tbody>
                 </table>
              </div>
           </div>
        ) : viewMode === 'wmPlanner' ? (
           /* --- 🧺 ตารางล้างเครื่องซักผ้า --- */
           <div className="bg-white rounded-[4rem] border p-12 max-w-4xl mx-auto shadow-2xl font-sans">
              <div className="bg-indigo-600 p-10 text-white flex justify-between items-center rounded-t-[3rem] font-sans">
                 <h2 className="text-2xl font-black italic uppercase font-sans">WM Service Report: {activeProperty.name}</h2>
              </div>
              {(() => {
                 const data = wmPlans[`${activePropertyId}_COMMON`] || {};
                 const checks = data.conditionChecklist || {};
                 return (
                    <div className={`p-12 border-x-4 border-b-4 rounded-b-[3.5rem] space-y-10 transition-all font-sans ${data.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                       <div className="grid grid-cols-2 gap-8 pt-6">
                          <div className="space-y-2 font-sans font-sans"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">วันที่ล้างจริง</p><input type="date" value={data.date || ""} onChange={e => handleUpdatePlan('wm', 'COMMON', 'date', e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none font-sans" /></div>
                          <div className="space-y-2 font-sans font-sans font-sans font-sans"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-sans font-sans">รอบโครงการ</p><select value={data.cycle || ""} onChange={e => handleUpdatePlan('wm', 'COMMON', 'cycle', e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-black outline-none font-sans"><option value="">เลือก</option><option value="1">ม.ค.-มิ.ย.</option><option value="2">ก.ค.-ธ.ค.</option></select></div>
                       </div>
                       <div className="space-y-4 font-sans font-sans font-sans font-sans font-sans">
                          <p className="text-xs font-black text-indigo-500 uppercase bg-indigo-50 px-4 py-2 rounded-full inline-block font-sans">Checklist สภาพเทคนิค</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-sans font-sans">
                             {WM_CHECKLIST.map(it => (
                                <label key={it} className="flex items-center gap-4 bg-slate-50 p-5 rounded-[2rem] border-2 border-transparent hover:border-indigo-100 transition-all cursor-pointer font-bold text-xs font-sans">
                                   <input type="checkbox" checked={checks[it] || false} className="w-5 h-5 accent-indigo-600" onChange={e => { const nc = {...checks, [it]: e.target.checked}; handleUpdatePlan('wm', 'COMMON', 'conditionChecklist', nc); }} /> {it}
                                </label>
                             ))}
                          </div>
                       </div>
                       <button onClick={() => handleUpdatePlan('wm', 'COMMON', 'done', !data.done)} className={`w-full py-8 rounded-[2.5rem] font-black text-xl uppercase font-sans ${data.done ? 'bg-emerald-200 text-emerald-700 shadow-none' : 'bg-slate-900 text-white shadow-2xl'}`}>{data.done ? 'บันทึกเรียบร้อย' : 'ยืนยันจบงานล้าง (เหมาตึก)'}</button>
                    </div>
                 )
              })()}
           </div>
        ) : (
           /* --- 🏢 ผังห้อง (Grid View) --- */
           <div className="space-y-6 animate-in fade-in font-sans">
              <div className="bg-white p-4 rounded-3xl border shadow-sm flex items-center gap-4">
                 <UserCheck size={24} className="text-indigo-600" />
                 <input value={workerName} onChange={e => setWorkerName(e.target.value)} placeholder="ระบุชื่อผู้บันทึก..." className="w-full font-black text-sm outline-none bg-transparent" />
              </div>

              {userRole === 'engineer' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans font-sans font-sans">
                    <div className="bg-amber-500 p-6 rounded-[2.5rem] text-white shadow-lg space-y-2">
                       <h4 className="font-black text-[10px] flex items-center gap-2 uppercase tracking-widest font-sans font-sans font-sans font-sans"><Hammer size={16}/> ภารกิจซ่อมวันนี้</h4>
                       {missions.repair.map(m => <div key={m} className="bg-white/20 p-2 rounded-xl font-black italic text-sm font-sans">ห้อง {m}</div>)}
                       {missions.repair.length===0 && <p className="text-[10px] italic opacity-60 font-sans">ไม่มีงานซ่อม</p>}
                    </div>
                    <div className="bg-sky-500 p-6 rounded-[2.5rem] text-white shadow-lg space-y-2">
                       <h4 className="font-black text-[10px] flex items-center gap-2 uppercase tracking-widest font-sans font-sans font-sans font-sans"><Wind size={16}/> คิวล้างแอร์วันนี้</h4>
                       {missions.air.map(m => <div key={m} className="bg-white/20 p-2 rounded-xl font-black italic text-sm font-sans">ห้อง {m}</div>)}
                       {missions.air.length===0 && <p className="text-[10px] italic opacity-60 font-sans">ไม่มีคิวล้างแอร์</p>}
                    </div>
                    <div className={`p-6 rounded-[2.5rem] text-white shadow-lg text-center flex flex-col justify-center items-center font-sans ${missions.wm ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}>
                       <WashingMachine size={24}/><p className="font-black text-[10px] mt-1 uppercase font-sans font-sans">{missions.wm ? 'ถึงรอบล้างเครื่อง' : 'เครื่องซักผ้าปกติ'}</p>
                    </div>
                 </div>
              )}

              {activeProperty?.floors.map(floor => (
                <div key={floor.level} className="space-y-4 font-sans">
                   <h3 className="font-black text-slate-400 text-[10px] uppercase pl-2 tracking-widest font-bold font-sans">ชั้น {floor.level}</h3>
                   <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                      {floor.rooms.map(roomNo => {
                        const info = roomStates[`${activePropertyId}_${roomNo}`] || { status: 'rented' };
                        const isHidden = userRole==='sales' && !['ready', 'rented', 'booked'].includes(info.status);
                        return (
                          <button key={roomNo} onClick={() => setSelectedRoom(roomNo)} className={`p-5 rounded-[2rem] font-black text-center shadow-sm border-b-4 border-black/10 transition-all font-sans font-sans ${STEPS[info.status]?.color || 'bg-slate-300'} text-white ${isHidden ? 'opacity-20' : 'active:scale-95 font-sans font-sans'}`}>
                            <div className="text-lg leading-none">{roomNo}</div>
                            <div className="text-[7px] uppercase opacity-70 mt-1">{STEPS[info.status]?.label}</div>
                          </button>
                        );
                      })}
                   </div>
                </div>
              ))}
           </div>
        )}
      </main>

      {/* --- 📱 MODAL: ENGINEER & SALES WORKFLOW (กางครบทุกหมวด) --- */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
           <div className="bg-white rounded-[3rem] w-full max-w-xl max-h-[85vh] overflow-y-auto p-10 shadow-2xl relative">
              <div className="flex justify-between items-center mb-10 font-sans font-sans font-sans">
                 <div className="font-sans font-sans font-sans"><h3 className="text-3xl font-black text-indigo-600">ห้อง {selectedRoom}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-widest font-sans">{activeProperty.name}</p></div>
                 <div className="flex gap-2">
                    <button onClick={() => setShowLogbook(!showLogbook)} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm font-sans ${showLogbook ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
                       {showLogbook ? <><Activity size={14} className="inline mr-1"/> Workflow</> : <><BookOpen size={14} className="inline mr-1"/> Tech Logbook</>}
                    </button>
                    <button onClick={() => setSelectedRoom(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X size={32}/></button>
                 </div>
              </div>

              {showLogbook ? (
                /* 🔥 TECHNICAL LOGBOOK */
                <div className="space-y-8 animate-in slide-in-from-bottom-2">
                   <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden font-sans font-sans font-sans font-sans">
                      <h4 className="text-xs font-black text-indigo-400 uppercase flex items-center gap-2 font-sans font-sans"><Info size={16}/> Tech Specs</h4>
                      <form onSubmit={saveTechnicalLog} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-1 font-sans font-sans"><p className="text-[8px] font-black opacity-60">แอร์ (BTU/รุ่น)</p><input name="air" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.airSpec} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs" /></div>
                         <div className="space-y-1 font-sans font-sans"><p className="text-[8px] font-black opacity-60">ไฟ (ขั้ว/วัตต์)</p><input name="light" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.lightSpec} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs" /></div>
                         <div className="space-y-1 font-sans font-sans"><p className="text-[8px] font-black opacity-60 font-sans">ก๊อกน้ำ (รุ่น)</p><input name="faucet" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.faucetSpec} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs" /></div>
                         {/* --- วางล่างช่อง chronic --- */}
                        <div className="space-y-1 font-sans font-sans font-sans font-sans">
                           <p className="text-[8px] font-black opacity-60 uppercase pl-1 font-sans">ราคาเช่ารายเดือน</p>
                           <input name="price" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.price} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-sm text-indigo-400 font-black font-sans" placeholder="เช่น 4,800" />
                        </div>
                        <div className="space-y-1 font-sans font-sans font-sans font-sans">
                           <p className="text-[8px] font-black opacity-60 uppercase pl-1 font-sans">Photo Link (URL)</p>
                           <input name="photoUrl" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.photoUrl} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-[8px] font-sans" placeholder="Link รูปภาพ..." />
                        </div>
                        <div className="md:col-span-2 space-y-1 font-sans font-sans font-sans font-sans font-sans">
                           <p className="text-[8px] font-black opacity-60 uppercase pl-1 font-sans">รายการเฟอร์นิเจอร์ (โชว์หน้าเซลล์)</p>
                           <textarea name="furnitures" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.furnitures} className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-xs min-h-[80px] font-sans" placeholder="ระบุรายการ..." />
                        </div>
                        {/* --- วางบนปุ่ม Submit --- */}
                         <div className="space-y-1 font-sans font-sans font-sans"><p className="text-[8px] font-black text-rose-400 font-sans">🚨 ปัญหาซ้ำซาก</p><input name="chronic" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.chronicIssue} className="w-full p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 font-sans" /></div>
                         <button type="submit" className="md:col-span-2 w-full bg-indigo-600 py-3 rounded-xl font-black text-xs uppercase shadow-lg"><Save size={14} className="inline mr-2"/> Save Tech Specs</button>
                      </form>
                      <Wrench size={180} className="absolute -right-20 -bottom-20 opacity-10 rotate-12 font-sans" />
                   </div>
                   <div className="space-y-2">
                      <h4 className="font-black text-xs flex items-center gap-2 text-slate-400 font-sans font-sans font-sans"><History size={16}/> ประวัติการซ่อม</h4>
                      {logHistory.map((log, i) => (
                         <div key={i} className="p-4 bg-white border-2 border-slate-50 rounded-2xl flex justify-between items-center shadow-sm">
                            <div className="font-sans font-sans"><p className="font-black text-xs text-slate-700 font-sans">{log.action}</p><p className="text-[9px] text-slate-400 font-bold font-sans">{log.details}</p></div>
                            <div className="text-right text-[9px] font-black text-indigo-500 font-sans font-sans">{log.displayTime}</div>
                         </div>
                      ))}
                   </div>
                </div>
              ) : (
                /* 🔥 SOP WORKFLOW ENGINE (กางออกครบทุกสเต็ป) */
                <form id="modalForm" className="space-y-6 font-sans">
                   {(() => {
                      const info = roomStates[`${activePropertyId}_${selectedRoom}`] || { status: 'rented' };
                      const cur = info.status;

                      // --- 🏷️ SALES VIEW (Safe Version) ---
                      if (userRole === 'sales') {
                        const spec = roomSpecs[`${activePropertyId}_${selectedRoom}`] || {};
                        const curStatus = roomStates[`${activePropertyId}_${selectedRoom}`]?.status || 'rented';

                        return (
                          <div className="space-y-6 animate-in zoom-in-95 duration-300 font-sans font-sans font-sans font-sans font-sans">
                             {/* การ์ดราคา */}
                             <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden font-sans font-sans">
                                <div className="relative z-10 font-sans font-sans font-sans">
                                   <p className="text-[10px] font-black opacity-60 uppercase mb-1 font-sans font-sans font-sans">Monthly Rate</p>
                                   <div className="flex items-baseline gap-2 font-sans font-sans font-sans">
                                      <span className="text-7xl font-black italic tracking-tighter font-sans font-sans">
                                         {spec?.price || 'TBD'}
                                      </span>
                                      <span className="text-xl font-bold opacity-80 font-sans font-sans">฿</span>
                                   </div>
                                </div>
                                {spec?.photoUrl && (
                                   <a href={spec.photoUrl} target="_blank" rel="noreferrer" className="mt-6 flex items-center justify-center gap-2 w-full py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 font-black hover:bg-white/40 transition-all font-sans font-sans">
                                      <Camera size={18} className="font-sans font-sans"/> ดูรูปห้องจริง
                                   </a>
                                )}
                                <ShoppingBag size={100} className="absolute -right-8 -bottom-8 opacity-10 rotate-12 font-sans font-sans" />
                             </div>

                             {/* รายการเฟอร์นิเจอร์ */}
                             <div className="bg-white p-6 rounded-[2rem] border-2 shadow-sm space-y-3 font-sans font-sans font-sans">
                                <h4 className="font-black text-indigo-600 uppercase text-xs flex items-center gap-2 font-sans font-sans font-sans"><Monitor size={16} className="font-sans font-sans"/> อุปกรณ์ภายในห้อง</h4>
                                <p className="text-sm font-bold text-slate-600 italic bg-slate-50 p-4 rounded-2xl font-sans font-sans font-sans">
                                   {spec?.furnitures || 'ยังไม่ได้ระบุข้อมูลอุปกรณ์'}
                                </p>
                             </div>

                             {/* ปุ่มจองห้อง (Safe logic) */}
                             {curStatus === 'ready' && (
                                <button type="button" onClick={() => handleUpdateRoom('booked')} className="w-full bg-purple-600 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl font-sans font-sans font-sans">
                              {/* --- ✅ ส่วนที่เพิ่ม: ผลตรวจความพร้อม (QC) สำหรับเซลล์เอาไว้โชว์ลูกค้า --- */}
                            {info.qcData && (
                               <div className="bg-emerald-50 p-6 rounded-[2.5rem] border-2 border-emerald-100 font-sans font-sans font-sans">
                                  <h5 className="font-black text-emerald-600 uppercase text-[10px] mb-4 flex items-center gap-2 font-sans font-sans">
                                     <ShieldCheck size={18} className="font-sans font-sans"/> รายการตรวจเช็คความพร้อมก่อนส่งมอบ (Room QC Passed)
                                  </h5>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 font-sans">
                                     {Object.entries(info.qcData).map(([name, checked]) => checked && (
                                        <div key={name} className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 font-sans font-sans">
                                           <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                                              <CheckCircle2 size={10} className="text-white font-sans"/>
                                           </div>
                                           {name}
                                        </div>
                                     ))}
                                  </div>
                                  <p className="mt-4 text-[9px] text-emerald-500 font-black italic border-t border-emerald-100 pt-3 font-sans">
                                     * ห้องผ่านการตรวจสอบระบบไฟ ประปา แอร์ และความสะอาดมาตรฐานโครงการเรียบร้อยแล้ว
                                  </p>
                               </div>
                            )}   
                                   RESERVE NOW
                                </button>
                             )}
                             
                             {curStatus === 'booked' && (
                                <div className="text-center p-8 bg-purple-50 rounded-[3rem] border-2 border-dashed border-purple-200 font-sans font-sans font-sans">
                                   <p className="font-black text-purple-600 uppercase text-2xl font-sans font-sans font-sans">จองแล้ว</p>
                                   <button type="button" onClick={() => handleUpdateRoom('ready')} className="text-slate-400 text-[10px] font-bold underline font-sans mt-4">ยกเลิก</button>
                                </div>
                             )}
                          </div>
                        );
                      }

                      // --- ENGINEER: แจ้งย้ายออก ---
                      if (cur === 'rented') return (
                         <div className="space-y-6 font-sans font-sans">
                            <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner space-y-6">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2 font-sans">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-sans">ชื่อลูกค้า</p>
                                     <input name="tName" className="w-full p-4 bg-white border-2 rounded-2xl font-bold text-sm outline-none focus:border-indigo-400 font-sans" placeholder="ชื่อ-นามสกุล" />
                                  </div>
                                  <div className="space-y-2 font-sans">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-sans">เบอร์ติดต่อ</p>
                                     <input name="tPhone" className="w-full p-4 bg-white border-2 rounded-2xl font-bold text-sm outline-none focus:border-indigo-400 font-sans" placeholder="08x-xxxxxxx" />
                                  </div>
                               </div>
                               {/* --- 📅 ช่องวันที่ที่นายสั่งเพิ่ม --- */}
                               <div className="space-y-2 font-sans">
                                  <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-2 font-sans">กำหนดวันย้ายออก (Check-out Date)</p>
                                  <input type="date" name="checkoutDate" className="w-full p-4 bg-white border-2 border-rose-100 rounded-2xl font-black text-lg outline-none focus:border-rose-400 font-sans text-rose-600" />
                               </div>
                            </div>
                            <button type="button" onClick={() => handleUpdateRoom('keyReturn')} className="w-full bg-indigo-600 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl hover:bg-indigo-700 transition-all active:scale-95 font-sans">
                               ยืนยันการแจ้งย้ายออก
                            </button>
                         </div>
                      );

                      // --- ENGINEER: ตรวจประกัน (กาง 6 หมวดเต็ม) ---
                      if (cur === 'pendingCheck') return (
                         <div className="space-y-6 font-sans">
                            <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2"><ClipboardCheck size={16}/> Checklist 6 หมวด (ตรวจคืนประกัน)</p>
                            {Object.entries(CHECKLIST_OUT).map(([group, items]) => (
                               <div key={group} className="space-y-2 font-sans font-sans">
                                  <p className="text-[9px] font-black text-slate-400 bg-slate-50 p-2 rounded-lg">{group}</p>
                                  {items.map(it => (
                                     <div key={it} className="bg-white p-4 border rounded-2xl space-y-3 shadow-sm font-sans font-sans">
                                        <label className="flex items-center gap-3 font-bold text-xs"><input type="checkbox" className="w-5 h-5 accent-rose-500" onChange={e => setRepairs({...repairs, [it]: {checked: e.target.checked}})} />{it}</label>
                                        {repairs[it]?.checked && <div className="flex gap-2 font-sans font-sans"><input placeholder="ค่าซ่อม" className="w-20 p-2 bg-slate-50 border rounded-xl text-xs font-black font-sans font-sans" onChange={e=>setRepairs({...repairs, [it]:{...repairs[it], price: e.target.value}})}/><input placeholder="จุดที่เสีย..." className="flex-1 p-2 bg-slate-50 border rounded-xl text-xs font-sans font-sans" onChange={e=>setRepairs({...repairs, [it]:{...repairs[it], note: e.target.value}})}/><button type="button" className="p-2 bg-slate-100 rounded-xl text-slate-400"><Camera size={16}/></button></div>}
                                     </div>
                                  ))}
                               </div>
                            ))}
                            <button type="button" onClick={() => handleUpdateRoom('cleaningPre')} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black text-xl uppercase shadow-lg font-sans font-sans font-sans">ยืนยันผลตรวจ</button>
                         </div>
                      );

                      // --- ENGINEER: หน้าซ่อม (ข้อมูลเด้งมาโชว์) ---
                      if (cur === 'maintenance') return (
                         <div className="space-y-6 font-sans font-sans font-sans">
                            <div className="bg-amber-50 p-8 rounded-[3rem] border-2 border-amber-200 shadow-inner font-sans font-sans">
                               <h4 className="font-black text-amber-600 uppercase text-xs mb-6 flex items-center gap-2 font-sans font-sans">
                                  <Wrench size={18} className="font-sans font-sans"/> รายการที่ต้องดำเนินการซ่อม (จากผลตรวจประกัน)
                               </h4>
                               
                               <div className="space-y-3 font-sans font-sans">
                                  {Object.entries(info.repairData || {}).map(([k,v]) => v.checked && (
                                     <div key={k} className="p-5 bg-white border-2 border-slate-50 rounded-[2rem] flex justify-between items-center shadow-sm font-sans font-sans">
                                        <div className="font-sans font-sans">
                                           <div className="flex items-center gap-2">
                                              <p className="font-black text-sm text-slate-800 font-sans">{k}</p>
                                              <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded-lg text-[9px] font-black font-sans">
                                                 ค่าซ่อม: {v.price || '0'} ฿
                                              </span>
                                           </div>
                                           <p className="text-[11px] text-amber-500 font-bold italic mt-1 font-sans font-sans">
                                              📌 หมายเหตุ: {v.note || 'ตรวจซ่อมตามมาตรฐาน'}
                                           </p>
                                        </div>
                                        <Camera className="text-slate-300 font-sans font-sans" size={24}/>
                                     </div>
                                  ))}
                               </div>

                               {Object.entries(info.repairData || {}).filter(([k,v]) => v.checked).length === 0 && (
                                  <p className="text-center text-slate-400 text-xs py-4 font-bold font-sans italic">--- ไม่มีรายการเสีย/ชำรุด ---</p>
                               )}
                            </div>

                            <button type="button" onClick={() => handleUpdateRoom('cleaningPost')} className="w-full bg-slate-900 text-white py-10 rounded-[3rem] font-black text-2xl shadow-xl uppercase font-sans font-sans transition-all active:scale-95 border-b-[10px] border-black/20 font-sans">
                               บันทึก: ดำเนินการซ่อมเสร็จสิ้น
                            </button>
                         </div>
                      );

                      // --- ENGINEER: Final QC (กางออกครบ) ---
                      if (cur === 'finalQC') return (
                         <div className="space-y-6 font-sans font-sans">
                            <p className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-2 font-sans font-sans"><ShieldCheck size={16}/> QC 6 หมวดก่อนเปิดขาย</p>
                            {Object.entries(CHECKLIST_QC).map(([group, items]) => (
                               <div key={group} className="space-y-2 font-sans">
                                  <p className="text-[9px] font-black text-indigo-400 bg-indigo-50 p-2 rounded-lg font-sans font-sans font-sans">{group}</p>
                                  {items.map(it => <label key={it} className="flex items-center gap-4 bg-white p-4 border rounded-2xl cursor-pointer font-bold text-xs shadow-sm font-sans font-sans"><input type="checkbox" className="w-5 h-5 accent-emerald-500 font-sans font-sans" onChange={e => setQcChecks({...qcChecks, [it]: e.target.checked})} /> {it}</label>)}
                               </div>
                            ))}
                            {/* --- 📝 เพิ่มช่องข้อเสนอแนะเพิ่มเติม (สไตล์นาย) --- */}
                            <div className="mt-6 space-y-2 font-sans font-sans font-sans">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2 font-sans font-sans">ข้อเสนอแนะ/จุดที่ต้องแก้ไขเพิ่มเติม</p>
                               <textarea 
                                  name="qcNote" 
                                  placeholder="กรอกรายละเอียดเพิ่มเติมที่นี่..."
                                  className="w-full p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] text-xs font-bold font-sans font-sans outline-none focus:border-indigo-300 min-h-[100px]"
                               />
                            </div>
                            <button type="button" onClick={() => handleUpdateRoom('ready')} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl uppercase shadow-lg font-sans font-sans font-sans">ผ่าน QC พร้อมเปิดขาย</button>
                         </div>
                      );

                      return <button type="button" onClick={() => handleUpdateRoom(STEPS[cur].next)} className="w-full bg-slate-900 text-white py-12 rounded-[2.5rem] font-black text-2xl uppercase shadow-2xl font-sans font-sans font-sans font-sans">{STEPS[cur].label} → {STEPS[STEPS[cur].next]?.label}</button>;
                   })()}
                </form>
              )}
           </div>
        </div>
      )}
    </div>
  );
}