import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Building2, X, Clock, Wrench, ClipboardCheck, Lock, Unlock, User, CheckCircle2, Key, Archive, LayoutGrid, UserCheck, Sparkles, Wind, Tablet as WashingMachine, Calendar, AlertTriangle, Settings, Camera, Phone, BookOpen, History, Save, Info, Bell, Hammer, Activity, ShieldCheck, Tag, ShoppingBag, BarChart3, ShoppingCart, ChevronRight, Monitor, Banknote, CreditCard } from 'lucide-react';

const ACCESS_PIN = "222222"; // สำหรับ Engineer Mode
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

const BANK_ACCOUNTS = {
  "บ้านมั่งมีทวีสุข": "กสิกรไทย: 051-1-88802-6 (ชวนันท์ สุขพรชัยรัก)",
  "บ้านมายทรี 48": "ไทยพาณิชย์: 039-232971-2 (บริษัท มายทรี 48 จำกัด)",
  "บ้านคุณหลวง": "ออมสิน: 020-2-2690349-8 (ชวนันท์ สุขพรชัยรัก)",
  "มีทรัพย์": "อาคารสงเคราะห์: 206-1-10007-54-2 (Chawanan Sukpornchairak)",
  "มีทอง": "กรุงไทย: 017-046047-9 (บริษัท ม.ทวีทอง จำกัด)"
};

const STEPS = {
  ready:         { label: 'พร้อมขาย', color: 'bg-emerald-500', next: 'appointment', owner: 'sales' },
  appointment:   { label: 'นัดดูห้อง', color: 'bg-pink-500', next: 'booked', owner: 'sales' },
  booked:        { label: 'รอย้ายเข้า/ทำสัญญา', color: 'bg-purple-600', next: 'rented', owner: 'sales' },
  rented:        { label: 'มีผู้เช่า', color: 'bg-slate-900', next: 'checkingOut', owner: 'sales' },
  checkingOut:   { label: 'แจ้งย้ายออก', color: 'bg-rose-500', next: 'keyReturn', owner: 'sales' },
  keyReturn:     { label: 'รอคืนกุญแจ', color: 'bg-amber-600', next: 'inspection', owner: 'sales' },
  inspection:    { label: 'ลงคิวตรวจห้อง', color: 'bg-orange-500', next: 'cleaningPre', owner: 'sales' },
  cleaningPre:   { label: 'ทำความสะอาดก่อนซ่อม', color: 'bg-blue-400', next: 'maintenance', owner: 'sales' },
  maintenance:   { label: 'รอเข้าซ่อม', color: 'bg-amber-500', next: 'cleaningPost', owner: 'engineer' },
  cleaningPost:  { label: 'ทำความสะอาดหลังซ่อม', color: 'bg-teal-400', next: 'finalQC', owner: 'sales' },
  finalQC:       { label: 'ตรวจ QC 6 หมวด', color: 'bg-indigo-600', next: 'ready', owner: 'engineer' }
};

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
    const docId = `${activePropertyId}_${selectedRoom}`;
    const timestamp = new Date().toLocaleString('th-TH');
    const info = roomStates[docId] || { status: 'ready' };

    // 2. เช็คสิทธิ์ตามเจ้าของสเต็ปปัจจุบัน
    const currentStepOwner = STEPS[info.status]?.owner;
    if (currentStepOwner && currentStepOwner !== userRole) {
      return alert(`ไม่อนุญาต! ขั้นตอนนี้สำหรับ ${currentStepOwner} เท่านั้น`);
    }

    // 3. เตรียมข้อมูลบันทึก (ระบุชื่อฝ่ายอัตโนมัติ)
    let updateData = {
      ...info,
      status: nextStep,
      // 🎯 เปลี่ยนจุดนี้: ให้บันทึกเป็นชื่อฝ่ายที่ Login อยู่แทน
      lastUpdateBy: userRole === 'sales' ? 'ฝ่ายขาย (Sales)' : 'ฝ่ายช่าง (Engineer)',
      lastUpdateTime: timestamp,
      propertyId: activePropertyId
    };

    // 4. ดึงข้อมูลจาก Modal Form (ฉบับปรับปรุงให้ตรงกับตาราง Summary)
    const form = document.getElementById('modalForm');
    if (form) {
      const formData = new FormData(form);
      
      if (formData.get('tName')) updateData.tenantName = formData.get('tName');
      if (formData.get('tPhone')) updateData.tenantPhone = formData.get('tPhone');
      
      // ✅ เปลี่ยนจาก appointmentDate เป็น tDate เพื่อให้โชว์ในตาราง Summary
      if (formData.get('tDate')) updateData.tDate = formData.get('tDate'); 
      
      // ✅ เปลี่ยนจาก tTime เป็น appointmentTime ให้ตรงกับ name ใน input
      if (formData.get('appointmentTime')) updateData.appointmentTime = formData.get('appointmentTime');
      
      if (formData.get('roomPrice')) updateData.roomPrice = formData.get('roomPrice');
      if (formData.get('insurance')) updateData.insurance = formData.get('insurance');
      if (formData.get('checkoutDate')) updateData.checkoutDate = formData.get('checkoutDate');
      if (formData.get('qcNote')) updateData.qcNote = formData.get('qcNote');
    }

    // 5. บันทึกข้อมูล Checklist (ซ่อม/QC)
    if (Object.keys(repairs).length > 0) updateData.repairData = repairs;
    if (Object.keys(qcChecks).length > 0) updateData.qcData = qcChecks;

    // 6. เคลียร์ข้อมูลเมื่อกลับไป "พร้อมขาย"
    if (nextStep === 'ready') {
      const keysToDelete = [
        'repairData', 'qcData', 'qcNote', 'tenantName', 'tenantPhone',
        'deposit', 'insurance', 'checkoutDate', 'appointmentDate', 'appointmentTime'
      ];
      keysToDelete.forEach(key => delete updateData[key]);
    }

    // 7. บันทึกลง Firebase
    await setDoc(doc(db, 'apartments', appId, 'rooms', docId), updateData);
    
    // 8. ปิด Modal และเคลียร์ค่าชั่วคราว
    setSelectedRoom(null);
    setRepairs({});
    setQcChecks({});
  };

  const handleUpdatePlan = async (type, id, field, value) => {
    
    const col = type === 'air' ? 'airPlans' : 'wmPlans';
    const docId = `${activePropertyId}_${id}`;
    const cur = (type === 'air' ? airPlans : wmPlans)[docId] || {};
    await setDoc(doc(db, 'apartments', appId, col, docId), { ...cur, [field]: value, updateBy: userRole === 'sales' ? 'Sales' : 'Engineer', updatedAt: new Date().toLocaleString('th-TH'), propertyId: activePropertyId });
  };

  const saveTechnicalLog = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await setDoc(doc(db, 'apartments', appId, 'roomSpecs', `${activePropertyId}_${selectedRoom}`), { 
      airSpec: formData.get('air'), lightSpec: formData.get('light'), faucetSpec: formData.get('faucet'), chronicIssue: formData.get('chronic'), lastUpdate: new Date().toLocaleString('th-TH')
    });
    alert("บันทึกสเปคเรียบร้อย!");
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
                <span>Engineer: 222222</span>
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
              
              {/* --- 🛠️ ส่วนของช่าง (ENGINEER) --- */}
              {userRole === 'engineer' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ภารกิจซ่อมวันนี้ */}
                    <div className="bg-amber-500 p-8 rounded-[3rem] text-white shadow-lg">
                      <h4 className="font-black text-xs uppercase mb-4 flex items-center gap-2"><Hammer size={18}/> ภารกิจซ่อมวันนี้</h4>
                      <div className="space-y-3">
                        {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'maintenance').map(([k,v]) => (
                          <div key={k} className="bg-white/20 p-4 rounded-2xl flex justify-between items-center">
                            <span className="font-black text-lg">ห้อง {k.split('_')[1]}</span>
                            <span className="text-[10px] font-bold italic opacity-70">รอดำเนินการซ่อม</span>
                          </div>
                        ))}
                        {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'maintenance').length === 0 && <p className="text-xs opacity-60 italic">ไม่มีงานซ่อมค้าง</p>}
                      </div>
                    </div>

                    {/* คิวตรวจ QC */}
                    <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-lg">
                      <h4 className="font-black text-xs uppercase mb-4 flex items-center gap-2"><ShieldCheck size={18}/> คิวตรวจ QC 6 หมวด</h4>
                      <div className="space-y-3">
                        {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'finalQC').map(([k,v]) => (
                          <div key={k} className="bg-white/20 p-4 rounded-2xl flex justify-between items-center">
                            <span className="font-black text-lg">ห้อง {k.split('_')[1]}</span>
                            <span className="text-[10px] font-bold italic opacity-70">รอตรวจก่อนส่งมอบ</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* งานล้างแอร์ & เครื่องซักผ้า */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-sky-500 p-8 rounded-[3rem] text-white shadow-lg">
                       <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-2"><Wind size={18}/> แผนล้างแอร์ประจำปี</h4>
                       <div className="flex flex-wrap gap-2 mt-4">
                          {Object.entries(airPlans).filter(([k,v]) => k.startsWith(activePropertyId) && !v.done).map(([k,v]) => (
                            <span key={k} className="bg-white/20 px-4 py-2 rounded-xl font-black text-xs">{k.split('_')[1]}</span>
                          ))}
                       </div>
                    </div>
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-lg">
                       <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-2"><WashingMachine size={18}/> รอบล้างเครื่องซักผ้า</h4>
                       <p className="text-xl font-black mt-2">รอบ: {wmPlans[`${activePropertyId}_COMMON`]?.cycle === "1" ? "ม.ค.-มิ.ย." : "ก.ค.-ธ.ค."}</p>
                       <p className="text-[10px] text-emerald-400 font-bold mt-2 uppercase tracking-widest">● {wmPlans[`${activePropertyId}_COMMON`]?.done ? "ดำเนินการแล้ว" : "รอดำเนินการ"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 💰 [SECTION 2] สรุปสถานะสำหรับเซลล์ (SALES SUMMARY) ฉบับ 5 กล่อง 5 สี --- */}
{userRole === 'sales' && (
  <div className="space-y-6 font-sans">
    {/* แถวบน: สรุปสถานะห้องสำคัญ 5 ด้าน (แยกสีชัดเจน) */}
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 text-white">
      
      {/* 🟢 1. ห้องพร้อมขาย (แบบแยกชั้น) - คงเดิม (emerald) */}
      <div className="bg-emerald-500 p-6 rounded-[2.5rem] shadow-lg border-b-[6px] border-emerald-700 lg:col-span-1">
         <h4 className="font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2"><Tag size={14}/> พร้อมขายแยกตามชั้น (Ready by Floor)</h4>
         <div className="space-y-3">
            {activeProperty?.floors.map(floor => {
               const readyRooms = floor.rooms.filter(r => roomStates[`${activePropertyId}_${r}`]?.status === 'ready');
               if (readyRooms.length === 0) return null;
               return (
                  <div key={floor.level} className="flex items-start gap-3 bg-white/10 p-2 rounded-2xl">
                     <div className="bg-white/20 px-3 py-1 rounded-xl min-w-[60px] text-center">
                        <span className="font-black text-[10px] uppercase">ชั้น {floor.level}</span>
                     </div>
                     <div className="flex flex-wrap gap-2 hover:opacity-80 transition-opacity">
                        {readyRooms.map(room => (
                           <button key={room} onClick={() => { setSelectedRoom(room); setViewMode('grid'); }} className="bg-white text-emerald-600 px-3 py-1 rounded-lg font-black text-xs shadow-sm italic active:scale-95 transition-all">{room}</button>
                        ))}
                     </div>
                  </div>
               )
            })}
            {Object.values(roomStates).filter(v => v.propertyId === activePropertyId && v.status === 'ready').length === 0 && (
               <p className="text-[10px] italic opacity-60 text-center py-4">--- ไม่มีห้องว่างพร้อมขาย ---</p>
            )}
         </div>
      </div>

      {/* 🔴 2. แจ้งย้าย (Notice) - คงเดิม (rose) */}
      <div className="bg-rose-500 p-6 rounded-[2.5rem] shadow-lg border-b-[6px] border-rose-700 lg:col-span-1">
         <h4 className="font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2"><Calendar size={14}/> แจ้งย้าย (Notice)</h4>
         <div className="space-y-1.5">
            {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && (v.status === 'checkingOut' || v.status === 'keyReturn')).map(([k,v]) => (
              <p key={k} className="text-[10px] font-bold leading-tight">• {k.split('_')[1]} (ออก: {v.tDate || v.checkoutDate || 'TBD'})</p>
            ))}
            {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && (v.status === 'checkingOut' || v.status === 'keyReturn')).length === 0 && (
               <p className="text-[10px] italic opacity-60">--- ไม่มีแจ้งย้าย ---</p>
            )}
         </div>
      </div>

      {/* 🟡 3. กำลังปรับปรุง (Repair) - คงเดิม (amber) */}
      <div className="bg-amber-500 p-6 rounded-[2.5rem] shadow-lg border-b-[6px] border-amber-700 lg:col-span-1">
         <h4 className="font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2"><Wrench size={14}/> กำลังปรับปรุง (Repair)</h4>
         <div className="space-y-1.5">
            {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && ['maintenance', 'cleaningPre', 'cleaningPost', 'finalQC'].includes(v.status)).map(([k,v]) => (
              <div key={k} className="flex justify-between items-center bg-white/10 px-2 py-1.5 rounded-lg">
                 <span className="font-black text-xs">{k.split('_')[1]}</span>
                 <span className="text-[8px] font-bold opacity-80 uppercase bg-white text-amber-600 px-1.5 py-0.5 rounded-full">{STEPS[v.status]?.label}</span>
              </div>
            ))}
            {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && ['maintenance', 'cleaningPre', 'cleaningPost', 'finalQC'].includes(v.status)).length === 0 && <p className="text-[10px] italic opacity-60">--- ไม่มีห้องซ่อมค้าง ---</p>}
         </div>
      </div>

      {/* 💖 4. กล่องนัดดูห้อง (หน้า Summary) */}
<div className="bg-pink-500 p-6 rounded-[2.5rem] shadow-lg border-b-[6px] border-pink-700">
   <h4 className="font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2"><Camera size={14}/> นัดดูห้อง</h4>
   <div className="space-y-2">
      {Object.entries(roomStates)
        .filter(([k, v]) => v.propertyId === activePropertyId && v.status === 'appointment')
        .map(([k, v]) => (
           <div key={k} className="bg-white/10 p-2.5 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-1">
                 <span className="font-black text-sm text-white">{k.split('_')[1]}</span>
                 {/* แสดงวันที่ */}
                 <span className="text-[8px] font-black bg-white text-pink-600 px-2 py-0.5 rounded-lg italic">
                   {v.tDate || 'TBD'}
                 </span>
              </div>
              {/* --- แสดงเวลา (จุดที่นายถามหา) --- */}
              <p className="text-[10px] font-black text-white">
                ⏰ {v.appointmentTime || 'ไม่ระบุเวลา'}
              </p>
              <p className="text-[8px] font-bold text-pink-100 truncate opacity-60">👤 {v.tenantName || 'รอลงชื่อ'}</p>
           </div>
      ))}
   </div>
</div>

      {/* 🟣 5. รอย้ายเข้า (Booked) - แยกใหม่ (purple) */}
      <div className="bg-purple-600 p-6 rounded-[2.5rem] shadow-lg border-b-[6px] border-purple-800 lg:col-span-1">
         <h4 className="font-black text-[10px] uppercase mb-4 tracking-widest flex items-center gap-2"><ShoppingBag size={14}/> รอย้ายเข้า (Booked)</h4>
         <div className="space-y-1.5">
            {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'booked').map(([k,v]) => (
               <div key={k} className="flex justify-between items-center bg-white/10 px-2 py-1.5 rounded-lg">
                  <span className="font-black text-xs">{k.split('_')[1]}</span>
                  <span className="text-[8px] font-bold opacity-80 uppercase bg-white text-purple-600 px-1.5 py-0.5 rounded-full">{v.tenantName} ({v.tDate || 'TBD'})</span>
               </div>
            ))}
            {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'booked').length === 0 && (
               <p className="text-[10px] italic opacity-60">--- ไม่มีคิวย้ายเข้า ---</p>
            )}
         </div>
      </div>

    </div> {/* 👈 ปิด Grid 5 กล่องสี */}

                  {/* 📋 ทะเบียนผู้เช่าปัจจุบัน (Active Tenants) */}
                  <div className="bg-white p-8 rounded-[3rem] border-2 shadow-sm overflow-hidden mt-6">
                     <div className="flex justify-between items-center mb-6">
                        <h4 className="font-black text-xs text-slate-400 uppercase flex items-center gap-2">
                           <User size={18}/> ทะเบียนผู้เช่าปัจจุบัน (Active Tenants)
                        </h4>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="text-[10px] font-black text-slate-300 uppercase border-b">
                              <tr>
                                 <th className="pb-4">ห้อง</th>
                                 <th className="pb-4">ชื่อผู้เช่า / เบอร์โทร</th>
                                 <th className="pb-4">วันที่เข้าอยู่</th>
                                 <th className="pb-4 text-right">ราคาห้อง</th>
                                 <th className="pb-4 text-center">จัดการ</th>
                              </tr>
                           </thead>
                           <tbody className="text-[11px] font-bold text-slate-600">
  {/* --------------------------------------------------------- */}
  {/* 🔵 กลุ่มที่ 1: ผู้เช่าปัจจุบัน (เช่าอยู่จริง / กำลังย้ายออก) */}
  {/* --------------------------------------------------------- */}
  <tr className="bg-slate-50">
    <td colSpan="5" className="py-2 px-4 text-[9px] text-slate-400 uppercase tracking-widest font-black">
      ● ผู้เช่าปัจจุบัน (Active Residents)
    </td>
  </tr>
  {Object.entries(roomStates)
    .filter(([k,v]) => v.propertyId === activePropertyId && v.tenantName && (v.status === 'rented' || v.status === 'checkingOut'))
    .map(([k,v]) => (
      <tr key={k} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
        <td className="py-4 font-black text-slate-900 text-lg pl-4">{k.split('_')[1]}</td>
        <td className="py-4">
          <div className="font-black text-slate-800">{v.tenantName}</div>
          <div className="text-[9px] text-slate-400 font-bold">{v.tenantPhone || '-'}</div>
        </td>
        <td className="py-4 font-mono text-slate-500">{v.tDate || '-'}</td>
        <td className="py-4 text-right font-black text-emerald-600">
          {String(v.roomPrice || 0).replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ฿
        </td>
        <td className="py-4 text-center">
          <button onClick={() => { setSelectedRoom(k.split('_')[1]); setViewMode('grid'); }} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
            <Settings size={16}/>
          </button>
        </td>
      </tr>
    ))}

  {/* --------------------------------------------------------- */}
  {/* 🔴 กลุ่มที่ 2: รายการนัดหมาย & จอง (Incoming) */}
  {/* --------------------------------------------------------- */}
  <tr className="bg-pink-50/50">
    <td colSpan="5" className="py-2 px-4 text-[9px] text-pink-400 uppercase tracking-widest font-black">
      ● รายการนัดหมาย & รอย้ายเข้า (Waitlist)
    </td>
  </tr>
  {Object.entries(roomStates)
    .filter(([k,v]) => v.propertyId === activePropertyId && v.tenantName && (v.status === 'booked' || v.status === 'appointment'))
    .map(([k,v]) => (
      <tr key={k} className="border-b border-pink-50 hover:bg-pink-50/30 transition-colors">
        <td className="py-4 font-black text-pink-600 italic text-lg pl-4">{k.split('_')[1]}</td>
        <td className="py-4">
          <div className="font-black text-slate-800">
            {v.tenantName} 
            <span className={`ml-2 text-[8px] px-1.5 py-0.5 rounded ${v.status === 'booked' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-500'}`}>
              {v.status === 'booked' ? 'จองแล้ว' : 'นัดดูห้อง'}
            </span>
          </div>
          <div className="text-[9px] text-slate-400 font-bold">{v.tenantPhone || '-'}</div>
        </td>
        <td className="py-4 font-mono text-pink-400 font-black">{v.tDate || v.appointmentDate || '-'}</td>
        <td className="py-4 text-right font-black text-slate-400">
          {v.status === 'booked' ? `${String(v.roomPrice || 0).replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ฿` : 'รอสรุปราคา'}
        </td>
        <td className="py-4 text-center">
          <button onClick={() => { setSelectedRoom(k.split('_')[1]); setViewMode('grid'); }} className="p-3 bg-pink-100 text-pink-400 rounded-2xl hover:bg-pink-500 hover:text-white transition-all shadow-sm">
            <Settings size={16}/>
          </button>
        </td>
      </tr>
    ))}

  {/* --------------------------------------------------------- */}
  {/* 🎯 กรณีไม่มีข้อมูลเลย (ใส่กลับมาให้แล้วครับนาย!) */}
  {/* --------------------------------------------------------- */}
  {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.tenantName && v.status !== 'ready').length === 0 && (
    <tr>
      <td colSpan="5" className="py-24 text-center">
        <div className="flex flex-col items-center justify-center space-y-3 opacity-20">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
            <Users size={30} className="text-slate-400" />
          </div>
          <p className="font-black text-slate-400 italic text-xs tracking-widest uppercase">--- ไม่พบข้อมูลผู้เช่าหรือนัดหมายในขณะนี้ ---</p>
        </div>
      </td>
    </tr>
  )}
</tbody>
                        </table>
                     </div>
                  </div>

                  {/* ตารางสรุปเงินประกัน/หักค่าเสียหาย */}
                  <div className="bg-white p-8 rounded-[3rem] border-2 shadow-sm overflow-hidden">
                     <h4 className="font-black text-xs text-slate-400 uppercase mb-6 flex items-center gap-2"><ClipboardCheck size={18}/> สรุปรายการคืนเงินประกัน</h4>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="text-[10px] font-black text-slate-300 uppercase border-b">
                              <tr>
                                 <th className="pb-4">ห้อง</th>
                                 <th className="pb-4">ลูกค้า</th>
                                 <th className="pb-4">เงินประกัน</th>
                                 <th className="pb-4">หักเสียหาย</th>
                                 <th className="pb-4">ยอดคืน</th>
                              </tr>
                           </thead>
                           <tbody className="text-[11px] font-bold text-slate-600">
  {Object.entries(roomStates)
    .filter(([k, v]) => v.propertyId === activePropertyId && v.repairData)
    .map(([k, v]) => {
      // 🎯 1. ดึงเงินประกันออกมา และล้างคอมม่าทิ้งก่อนแปลงเป็นตัวเลข
      const insurance = Number(String(v.insurance || 0).replace(/,/g, ''));

      // 🎯 2. รวมค่าเสียหาย และล้างคอมม่าทิ้งก่อนบวกเลข
      const totalDamaged = Object.values(v.repairData).reduce((sum, item) => {
        const price = Number(String(item.price || 0).replace(/,/g, ''));
        return sum + price;
      }, 0);

      // 🎯 3. คำนวณยอดคืน (ประกัน - เสียหาย)
      const finalRefund = insurance - totalDamaged;

      return (
        <tr key={k} className="border-b border-slate-50">
          <td className="py-4 font-black text-slate-900">{k.split('_')[1]}</td>
          <td className="py-4">{v.tenantName || '-'}</td>
          
          {/* แสดงผลเงินประกันแบบใส่คอมม่ากลับเข้าไปให้สวยๆ */}
          <td className="py-4 text-slate-500">
            {insurance.toLocaleString()} ฿
          </td>
          
          <td className="py-4 text-rose-500">
            -{totalDamaged.toLocaleString()} ฿
          </td>
          
          <td className="py-4 text-emerald-600 font-black text-sm">
            {finalRefund.toLocaleString()} ฿
          </td>
        </tr>
      );
    })}
</tbody>
                        </table>
                     </div>
                  </div>
                </div>
              )}
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

              {/* --- 💰 แจ้งเตือนภารกิจเซลล์ (Missions) แยกส่วนชัดเจน --- */}
{userRole === 'sales' && (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 1. แจ้งเตือน: นัดดูห้อง (Appointment) - สีชมพู */}
      <div className="bg-pink-500 p-6 rounded-[2.5rem] text-white shadow-lg flex items-center gap-4">
          <Camera size={30} className="opacity-50" />
          <div>
            <h4 className="font-black text-[10px] uppercase tracking-widest">นัดดูห้องวันนี้</h4>
            <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'appointment').map(([k,v]) => (
                  <span key={k} className="bg-white/20 px-2 py-1 rounded-lg text-xs font-black">{k.split('_')[1]}</span>
                ))}
                {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'appointment').length === 0 && <span className="text-[10px] opacity-60">ไม่มีนัด</span>}
            </div>
          </div>
      </div>

      {/* 2. แจ้งเตือน: รอย้ายเข้า (Booked) - สีม่วง */}
      <div className="bg-purple-600 p-6 rounded-[2.5rem] text-white shadow-lg flex items-center gap-4">
          <ShoppingBag size={30} className="opacity-50" />
          <div>
            <h4 className="font-black text-[10px] uppercase tracking-widest">รอย้ายเข้า/ทำสัญญา</h4>
            <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'booked').map(([k,v]) => (
                  <span key={k} className="bg-white/20 px-2 py-1 rounded-lg text-xs font-black">{k.split('_')[1]}</span>
                ))}
                {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'booked').length === 0 && <span className="text-[10px] opacity-60">ไม่มีคิว</span>}
            </div>
          </div>
      </div>

      {/* 3. แจ้งเตือน: คืนกุญแจ (Key Return) - สีแดง */}
      <div className="bg-rose-500 p-6 rounded-[2.5rem] text-white shadow-lg flex items-center gap-4">
          <Key size={30} className="opacity-50" />
          <div>
            <h4 className="font-black text-[10px] uppercase tracking-widest">คืนกุญแจวันนี้</h4>
            <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'keyReturn').map(([k,v]) => (
                  <span key={k} className="bg-white/20 px-2 py-1 rounded-lg text-xs font-black">ห้อง {k.split('_')[1]}</span>
                ))}
                {Object.entries(roomStates).filter(([k,v]) => v.propertyId === activePropertyId && v.status === 'keyReturn').length === 0 && <span className="text-[10px] opacity-60">ไม่มีนัด</span>}
            </div>
          </div>
      </div>
  </div>
)}

              {activeProperty?.floors.map(floor => (
                <div key={floor.level} className="space-y-4 font-sans">
                   <h3 className="font-black text-slate-400 text-[10px] uppercase pl-2 tracking-widest font-bold font-sans">ชั้น {floor.level}</h3>
                   <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                      {floor.rooms.map(roomNo => {
                        const info = roomStates[`${activePropertyId}_${roomNo}`] || { status: 'rented' };
                        const stepConfig = STEPS[info.status] || STEPS.ready;
                        const isNotMyTurn = userRole !== stepConfig.owner;
                        const isHidden = isNotMyTurn && !(userRole === 'engineer' && info.status === 'ready');
                        return (
                          <button key={roomNo} onClick={() => setSelectedRoom(roomNo)} className={`p-5 rounded-[2rem] font-black text-center shadow-sm border-b-4 border-black/10 transition-all font-sans font-sans ${STEPS[info.status]?.color || 'bg-slate-300'} text-white ${isHidden ? 'opacity-20 pointer-events-none' : 'active:scale-95'}`}>
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
                         <div className="space-y-1 font-sans font-sans font-sans"><p className="text-[8px] font-black text-rose-400 font-sans">🚨 ปัญหาซ้ำซาก</p><input name="chronic" defaultValue={roomSpecs[`${activePropertyId}_${selectedRoom}`]?.chronicIssue} className="w-full p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 font-sans" /></div>
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
  const info = roomStates[`${activePropertyId}_${selectedRoom}`] || { status: 'ready' };
  const cur = info.status;

  // 📌 สถานะ: นัดดูห้อง (Appointment)
if (cur === 'appointment') return (
  <div className="space-y-6">
    <div className="bg-pink-50 p-8 rounded-[2.5rem] border-2 border-pink-100 shadow-inner space-y-4">
      <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest pl-2 font-sans">ลงทะเบียนนัดดูห้อง</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 pl-2 font-sans">ชื่อลูกค้า</p>
          <input name="tName" defaultValue={info.tenantName} className="w-full p-4 bg-white border-2 rounded-2xl font-bold text-sm outline-none" placeholder="ชื่อลูกค้า" />
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 pl-2 font-sans">เบอร์ติดต่อ</p>
          <input name="tPhone" defaultValue={info.tenantPhone} className="w-full p-4 bg-white border-2 rounded-2xl font-bold text-sm outline-none" placeholder="เบอร์โทร" />
        </div>
        {/* แก้ตรงนี้: แบ่งจาก 1 คอลัมน์ยาว เป็น 2 ช่องคู่กัน */}
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-rose-500 pl-2 font-sans">วันที่นัดหมาย</p>
          <input name="tDate" defaultValue={info.tDate || info.appointmentDate} className="w-full p-4 bg-white border-2 border-rose-200 rounded-2xl font-black text-sm text-rose-600 outline-none" placeholder="15/04/2569" />
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-rose-500 pl-2 font-sans">เวลานัดหมาย</p>
          <input name="appointmentTime" defaultValue={info.appointmentTime} className="w-full p-4 bg-white border-2 border-rose-200 rounded-2xl font-black text-sm text-rose-600 outline-none" placeholder="14:30" />
        </div>
      </div>
      <button type="button" onClick={() => handleUpdateRoom('appointment')} className="w-full py-3 bg-white border-2 border-pink-200 text-pink-500 rounded-xl font-bold text-xs hover:bg-pink-500 hover:text-white transition-all">
        อัปเดตข้อมูลนัดหมาย (บันทึกไว้ดูในหน้าสรุป)
      </button>
    </div>

    <div className="grid grid-cols-2 gap-4">
      {/* ❌ ถ้าไม่สนใจ: กดแล้วข้อมูลจะถูกล้างและกลับไป 'Ready' */}
      <button type="button" onClick={() => handleUpdateRoom('ready')} className="bg-slate-200 text-slate-500 py-8 rounded-[2rem] font-black text-lg uppercase shadow-md active:scale-95">ไม่สนใจ / ยกเลิก</button>
      
      {/* ✅ ถ้าเอา: กดแล้วจะพาไปหน้า 'Booked' เพื่อกรอกเงินประกันต่อ */}
      <button type="button" onClick={() => handleUpdateRoom('booked')} className="bg-pink-500 text-white py-8 rounded-[2rem] font-black text-lg uppercase shadow-xl active:scale-95">ตกลงเช่า → ไปหน้าจอง</button>
    </div>
  </div>
);

// 📌 สถานะ: รอย้ายเข้า (Booked)
if (cur === 'booked') return (
  <div className="space-y-6">
    <div className="bg-purple-50 p-8 rounded-[2.5rem] border-2 border-purple-100 shadow-inner space-y-5">
      <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest pl-2 font-sans">ข้อมูลการจองและค่าประกัน</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ... ชื่อ, เบอร์, ราคา, เงินประกัน คงเดิม ... */}
        <div className="space-y-1"><p className="text-[9px] font-bold text-slate-400 pl-2 font-sans">ชื่อผู้เช่า</p><input name="tName" defaultValue={info.tenantName} className="w-full p-4 bg-white border-2 rounded-2xl font-bold text-sm outline-none" /></div>
        <div className="space-y-1"><p className="text-[9px] font-bold text-slate-400 pl-2 font-sans">เบอร์ติดต่อ</p><input name="tPhone" defaultValue={info.tenantPhone} className="w-full p-4 bg-white border-2 rounded-2xl font-bold text-sm outline-none" /></div>
        <div className="space-y-1"><p className="text-[9px] font-bold text-slate-400 pl-2 font-sans">ราคาค่าห้อง/เดือน</p><input name="roomPrice" defaultValue={info.roomPrice} className="w-full p-4 bg-white border-2 rounded-2xl font-black text-sm text-indigo-600 outline-none" /></div>
        <div className="space-y-1"><p className="text-[9px] font-bold text-rose-500 pl-2 font-sans uppercase">เงินประกัน</p><input name="insurance" defaultValue={info.insurance || ""} className="w-full p-4 bg-white border-2 border-rose-200 rounded-2xl font-black text-sm text-rose-600 outline-none" /></div>
        
        {/* แก้ตรงนี้: แยกวันที่กับเวลาเป็น 2 ช่องคู่กัน */}
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-purple-600 pl-2 font-sans">วันที่ย้ายเข้าจริง</p>
          <input name="tDate" defaultValue={info.tDate} className="w-full p-4 bg-white border-2 border-purple-200 rounded-2xl font-black text-sm text-purple-600 outline-none" placeholder="15/04/2569" />
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-purple-600 pl-2 font-sans">เวลานัดหมาย</p>
          <input name="appointmentTime" defaultValue={info.appointmentTime} className="w-full p-4 bg-white border-2 border-purple-200 rounded-2xl font-black text-sm text-purple-600 outline-none" placeholder="09:00" />
        </div>
      </div>
    </div>
    <button type="button" onClick={() => handleUpdateRoom('rented')} className="w-full bg-purple-600 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl border-b-[10px] border-purple-800 active:scale-95 transition-all">ยืนยันทำสัญญา → เช่าอยู่จริง</button>
  </div>
);

//📌 4. สถานะ: มีผู้เช่า (Rented)
if (cur === 'rented') return (
  <div className="space-y-6 font-sans">
    <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
      <p className="text-[10px] font-black opacity-50 uppercase mb-4 tracking-widest">ข้อมูลผู้เช่าปัจจุบัน</p>
      <div className="space-y-4 relative z-10">
        <div className="flex items-center gap-3">
          <UserCheck size={20} className="text-indigo-400"/>
          <p className="font-black text-xl">{info.tenantName || 'ไม่ระบุชื่อ'}</p>
        </div>
      </div>
    </div>

    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner space-y-5">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">แก้ไขข้อมูล (Update ข้อมูลลง Summary)</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 pl-2 font-black text-indigo-600">ราคาค่าห้อง</p>
          <input name="roomPrice" defaultValue={info.roomPrice} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm text-indigo-600" />
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-bold text-slate-400 pl-2 font-black text-emerald-600">วันที่เข้าอยู่</p>
          <input name="tDate" defaultValue={info.tDate} className="w-full p-4 bg-slate-50 border-2 rounded-2xl font-black text-sm text-emerald-600" />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3">
      <button type="button" onClick={() => handleUpdateRoom('rented')} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs">บันทึกการแก้ไขข้อมูล</button>
      <button type="button" onClick={() => handleUpdateRoom('checkingOut')} className="w-full bg-rose-500 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl border-b-[10px] border-rose-700">แจ้งย้ายออก (Notice Out)</button>
    </div>
  </div>
);

                      //📌 5. สถานะ: แจ้งย้ายออก (Checking Out)
                      if (cur === 'checkingOut') return (
                        <div className="space-y-6 font-sans">
                           <div className="bg-rose-50 p-8 rounded-[2.5rem] border-2 border-rose-100 shadow-inner space-y-6">
                              <div className="space-y-2">
                                 <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-2 flex items-center gap-2">
                                    <Calendar size={16}/> ระบุวันที่ลูกค้าจะย้ายออก
                                 </p>
                                 <input type="date" name="checkoutDate" defaultValue={info.checkoutDate} className="w-full p-4 bg-white border-2 border-rose-200 rounded-2xl font-black text-xl text-rose-600 outline-none" />
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 italic px-2">
                                 * ห้องจะค้างอยู่ที่สถานะ "แจ้งย้ายออก" จนกว่านายจะกดปุ่ม "คืนกุญแจแล้ว"
                              </p>
                           </div>

                           <div className="grid grid-cols-1 gap-3">
                              {/* ปุ่มที่ 1: บันทึกแค่วันที่ สถานะอยู่ที่เดิม */}
                              <button type="button" onClick={() => handleUpdateRoom('checkingOut')} className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs">
                                 บันทึกวันที่ย้ายออก (Update Date)
                              </button>

                              {/* ปุ่มที่ 2: ไปต่อที่รอคืนกุญแจ/คืนแล้ว */}
                              <button type="button" onClick={() => handleUpdateRoom('keyReturn')} className="w-full bg-slate-900 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl">
                                 ดำเนินการคืนกุญแจ
                              </button>
                           </div>
                        </div>
                      ); 

                      // ENGINEER: แจ้งย้ายออก
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
                               // 📅 ช่องวันที่ที่นายสั่งเพิ่ม 
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

                      // 📌 7. สถานะ: ลงคิวตรวจห้องเพื่อคืนเงินประกัน (Inspection)
if (cur === 'inspection') {
  // 🎯 ดึงเงินประกันมาลบคอมม่าออกก่อนคำนวณ จะได้ไม่เป็น NaN
  const insurance = Number(String(info.insurance || 0).replace(/,/g, ''));
  
  // 🎯 รวมค่าเสียหายที่ช่าง/เซลล์ ติ๊กเลือก
  const totalRepair = Object.values(repairs).reduce((sum, item) => sum + Number(String(item.price || 0).replace(/,/g, '')), 0);
  
  const finalRefund = insurance - totalRepair;

  return (
    <div className="space-y-6 font-sans">
      {/* 💰 การ์ดคำนวณเงินประกันอัตโนมัติ */}
      <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border-b-[10px] border-indigo-500">
        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">เงินประกันตั้งต้น</p>
            <p className="text-2xl font-black text-white">{insurance.toLocaleString()} ฿</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">รวมค่าเสียหาย</p>
            <p className="text-2xl font-black text-rose-400">-{totalRepair.toLocaleString()} ฿</p>
          </div>
          <div className="col-span-2 pt-4 border-t border-white/10">
            <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">
              {finalRefund >= 0 ? "ยอดเงินที่ต้องคืนลูกค้า" : "🚨 ลูกค้าต้องจ่ายเพิ่ม (เกินวงเงินประกัน)"}
            </p>
            <p className={`text-5xl font-black italic tracking-tighter ${finalRefund >= 0 ? 'text-emerald-400' : 'text-rose-500 animate-pulse'}`}>
              {Math.abs(finalRefund).toLocaleString()} ฿
            </p>
          </div>
        </div>
        <Banknote size={150} className="absolute -right-20 -bottom-20 opacity-10 rotate-12" />
      </div>

      {/* 📋 รายการหักค่าเสียหาย 6 หมวด */}
      <div className="space-y-4">
        <p className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2 pl-2">
          <ClipboardCheck size={16}/> รายการความเสียหาย (หักจากเงินประกัน)
        </p>
        {Object.entries(CHECKLIST_OUT).map(([group, items]) => (
          <div key={group} className="space-y-2">
            <p className="text-[9px] font-black text-slate-400 bg-slate-50 p-2 rounded-lg">{group}</p>
            {items.map(it => (
              <div key={it} className="bg-white p-4 border-2 rounded-2xl space-y-3 shadow-sm">
                <label className="flex items-center gap-4 cursor-pointer font-bold text-xs">
                  <input 
                    type="checkbox" 
                    className="w-6 h-6 accent-rose-500 rounded-lg" 
                    checked={repairs[it]?.checked || false}
                    onChange={e => setRepairs({...repairs, [it]: {...repairs[it], checked: e.target.checked, price: repairs[it]?.price || "0"}})} 
                  />
                  {it}
                </label>
                {repairs[it]?.checked && (
                  <div className="flex gap-2 animate-in slide-in-from-left-2">
                    <input 
                      type="text" 
                      placeholder="ราคา" 
                      className="w-24 p-3 bg-rose-50 border-2 border-rose-100 rounded-xl text-xs font-black text-rose-600 outline-none" 
                      value={repairs[it].price}
                      onChange={e => setRepairs({...repairs, [it]: {...repairs[it], price: e.target.value}})}
                    />
                    <input 
                      placeholder="โน้ตเพิ่มเติม..." 
                      className="flex-1 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs outline-none"
                      onChange={e => setRepairs({...repairs, [it]: {...repairs[it], note: e.target.value}})}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <button 
        type="button" 
        onClick={() => handleUpdateRoom('cleaningPre')} 
        className="w-full bg-indigo-600 text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl transition-all active:scale-95"
      >
        บันทึกผลการตรวจ & ส่งงานซ่อม
      </button>
    </div>
  );
}

                      //📌 9. สถานะ: รอเข้าซ่อม (Maintenance - หน้าช่าง)
                      if (cur === 'maintenance') return (
                        <div className="space-y-6 font-sans">
                           <div className="bg-amber-500 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden">
                              <div className="relative z-10">
                                 <h4 className="font-black uppercase text-xs mb-2 flex items-center gap-2 opacity-80">
                                    <Hammer size={18}/> รายการที่ต้องดำเนินการซ่อม
                                 </h4>
                                 <p className="text-[10px] font-bold italic">ข้อมูลเด้งมาจากรายการที่เซลล์ตรวจหักเงินประกัน</p>
                              </div>
                              <Wrench size={120} className="absolute -right-10 -bottom-10 opacity-20 rotate-12" />
                           </div>

                           <div className="space-y-3">
                              {Object.entries(info.repairData || {}).map(([k, v]) => v.checked && (
                                 <div key={k} className="p-5 bg-white border-2 border-slate-100 rounded-[2rem] shadow-sm space-y-3">
                                    <div className="flex justify-between items-start">
                                       <div className="flex-1">
                                          <p className="font-black text-slate-800 text-sm">{k}</p>
                                          <p className="text-[10px] text-amber-600 font-bold italic mt-1">
                                             📌 หมายเหตุเซลล์: {v.note || 'ไม่มีระบุ'}
                                          </p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[8px] font-black text-slate-400 uppercase">งบที่หักมา</p>
                                          <p className="text-xs font-black text-rose-500">{Number(v.price).toLocaleString()} ฿</p>
                                       </div>
                                    </div>
                                    
                                    {/* ช่องให้ช่างระบุราคาประเมินจริงเพื่อให้งบสมดุล */}
                                    <div className="pt-3 border-t border-dashed flex items-center gap-3">
                                       <p className="text-[9px] font-black text-slate-400 uppercase">ราคาประเมินจริง:</p>
                                       <input 
                                          type="number" 
                                          placeholder="0"
                                          className="flex-1 p-2 bg-slate-50 border rounded-xl text-xs font-black text-indigo-600 outline-none focus:border-indigo-300"
                                          defaultValue={v.engineerPrice || v.price}
                                          onChange={e => {
                                             const newRepairData = { ...info.repairData, [k]: { ...v, engineerPrice: e.target.value } };
                                             setRepairs(newRepairData); // ใช้ state เพื่อเตรียมบันทึก
                                          }}
                                       />
                                    </div>
                                 </div>
                              ))}

                              {/* กรณีไม่มีรายการซ่อม */}
                              {Object.entries(info.repairData || {}).filter(([k,v]) => v.checked).length === 0 && (
                                 <div className="text-center py-10 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold text-xs italic">--- ไม่มีรายการที่ต้องซ่อม ---</p>
                                 </div>
                              )}
                           </div>

                           <div className="grid grid-cols-1 gap-3">
                              <button 
                                 type="button" 
                                 onClick={() => handleUpdateRoom('cleaningPost')} 
                                 className="w-full bg-slate-900 text-white py-10 rounded-[3rem] font-black text-2xl shadow-xl uppercase transition-all active:scale-95 border-b-[10px] border-black/20"
                              >
                                 บันทึก: ซ่อมเสร็จเรียบร้อย
                              </button>
                           </div>
                        </div>
                      );

                      //📌 11. สถานะ: ตรวจ QC 6 หมวดก่อนเปิดขาย (Final QC - หน้าช่าง)
                      if (cur === 'finalQC') return (
                        <div className="space-y-6 font-sans">
                           <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl flex items-center gap-4">
                              <ShieldCheck size={40} className="text-indigo-200" />
                              <div>
                                 <h4 className="font-black uppercase text-sm italic">Final Quality Control</h4>
                                 <p className="text-[10px] font-bold opacity-70">ช่างตรวจสอบความเรียบร้อย 6 หมวดก่อนส่งมอบงาน</p>
                              </div>
                           </div>

                           <div className="space-y-6">
                              {Object.entries(CHECKLIST_QC).map(([group, items]) => (
                                 <div key={group} className="space-y-3">
                                    <p className="text-[10px] font-black text-indigo-500 bg-indigo-50 p-2 rounded-lg inline-block uppercase tracking-widest">{group}</p>
                                    <div className="grid grid-cols-1 gap-2">
                                       {items.map(it => (
                                          <label key={it} className="flex items-center gap-4 bg-white p-4 border-2 border-slate-50 rounded-2xl cursor-pointer hover:border-indigo-100 transition-all shadow-sm">
                                             <input 
                                                type="checkbox" 
                                                className="w-6 h-6 accent-emerald-500 rounded-lg"
                                                checked={qcChecks[it] || false}
                                                onChange={e => setQcChecks({...qcChecks, [it]: e.target.checked})} 
                                             /> 
                                             <span className="text-xs font-bold text-slate-700">{it}</span>
                                          </label>
                                       ))}
                                    </div>
                                 </div>
                              ))}
                           </div>

                           <div className="bg-slate-50 p-6 rounded-[2.5rem] border-2 border-dashed border-slate-200 space-y-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase pl-2">ข้อเสนอแนะเพิ่มเติมจากช่าง</p>
                              <textarea 
                                 name="qcNote" 
                                 placeholder="ระบุจุดที่อยากให้เซลล์ระวัง หรือข้อมูลเพิ่มเติม..."
                                 className="w-full p-4 bg-white border-2 rounded-2xl text-xs font-bold outline-none focus:border-indigo-400 min-h-[100px]"
                              />
                           </div>

                           <button 
                              type="button" 
                              onClick={() => handleUpdateRoom('ready')} 
                              className="w-full bg-emerald-500 text-white py-10 rounded-[3rem] font-black text-2xl shadow-xl uppercase transition-all active:scale-95 border-b-[10px] border-emerald-700"
                           >
                              ผ่าน QC: เปิดขายห้องทันที
                           </button>
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