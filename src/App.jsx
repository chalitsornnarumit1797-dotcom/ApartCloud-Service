// --- โค้ดชุดสมบูรณ์สำหรับ APART-CLOUD-SERVICE ---
// ก๊อปปี้ไปวางทับ App.jsx ได้เลย ข้อมูลเดิมไม่หายครับ!

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Building2, X, Clock, Wrench, Sparkles, ClipboardCheck, Lock, Unlock, User, DollarSign, CheckCircle2, Key, Calendar, Save, LogOut, AlertCircle, FileText, PieChart, Bell, History, Archive, Trash2, ListChecks } from 'lucide-react';

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
const appId = 'apartcloud-service'; 

const STATUS_FLOW = {
  ready: { label: 'พร้อมขาย', color: 'bg-emerald-500', next: 'rented' },
  rented: { label: 'มีผู้เช่า', color: 'bg-slate-400', next: 'notice' },
  notice: { label: 'แจ้งย้ายออก', color: 'bg-orange-400', next: 'pendingCheck' },
  pendingCheck: { label: 'คิวตรวจห้อง', color: 'bg-rose-500', next: 'cleaning' },
  cleaning: { label: 'คิวทำความสะอาด', color: 'bg-sky-400', next: 'maintenance' },
  maintenance: { label: 'รอซ่อม', color: 'bg-amber-500', next: 'cleaningPost' },
  cleaningPost: { label: 'คิวทำความสะอาดหลังซ่อม', color: 'bg-cyan-500', next: 'finalQC' },
  finalQC: { label: 'ตรวจก่อนขาย', color: 'bg-indigo-500', next: 'ready' }
};

const REPAIR_ITEMS_GENERAL = {
  "1.หมวดเฟอร์นิเจอร์": ["กระจกโต๊ะเครื่องแป้ง", "กระจกตู้เสื้อผ้า", "ตู้เสื้อผ้า", "โต๊ะเครื่องแป้ง", "โต๊ะข้างเตียง", "โต๊ะวางทีวี", "ชั้นวางบนทีวี", "เก้าอี้ในห้อง", "หูแขวน+ รางผ้าม่าน", "ผ้าม่าน", "เตียงที่นอน"],
  "2.หมวดอุปกรณ์ห้องน้ำ": ["บานเกล็ด/บานกระทุ้งห้องน้ำ", "กระจกในห้องน้ำ", "ก๊อกน้ำในห้องน้ำ+ระเบียง", "ชุดฝักบัว ชุดฉีดชำระ", "ที่แขวนกระดาษทิชชู่", "อ่างล้างหน้า", "ชักโครกแตก", "ประตู PVC ห้องน้ำ", "ท่อตัน", "กระเบื้องในห้องน้ำ", "กระเบื้องแกรนิตโต้", "ฝาครอบท่อระบียง+ห้องน้ำ"],
  "3.หมวดทาสี": ["รอยตอกตะปู ,เทปกาว2 หน้า", "ประตูไม้", "ประตูมุ้งลวด", "ประตูมีเนียม", "มุ้งลวดช่องลมห้องน้ำ", "สีในห้อง ฝ้าเพดาน ระเบียง", "เหมาทาทั้งแผงผนัง"],
  "4.หมวดย้ายออก": ["แอบเลี้ยงสัตว์", "ทำความสะอาด"],
  "5.หมวดแอร์": ["รีโมทแอร์", "เครื่องปรับอากาศ"],
  "6.หมวดอื่นๆ": ["ชุดโซ่คล้องห้อง", "กุญแจ(ลูกกุญแจ)", "คีย์การ์ดหาย", "ลูกบิดประตู", "คราบดำในห้องน้ำ", "ลืมกุญแจ", "งัดประตู งัดกุญแจเสียหาย"]
};

const QC_LIST = [
  { group: "1. หมวดประตู-หน้าต่าง", items: ["กลอนและกุญแจ", "บานพับ", "หน้าต่าง", "ช่องว่างขอบ"] },
  { group: "2. หมวดระบบไฟฟ้า", items: ["แสงสว่าง", "ปลั๊กไฟ", "แอร์", "ตู้ไฟ"] },
  { group: "3. หมวดพื้นและผนัง", items: ["กระเบื้อง", "ความลาดเอียง", "ยาแนว", "ผนังเรียบ", "สีสม่ำเสมอ"] },
  { group: "4. หมวดเฟอร์นิเจอร์", items: ["ตู้เสื้อผ้า", "บานพับ/มือจับ", "เตียงนอน", "โต๊ะเก้าอี้", "ผ้าม่าน", "ฟูกที่นอน"] },
  { group: "5. หมวดระบบสุขาภิบาล", items: ["ชักโครก", "ยาแนวสุขภัณฑ์", "ก๊อกน้ำ/ฝักบัว", "ท่อน้ำทิ้ง", "เพดานไม่รั่ว"] },
  { group: "6. หมวดระบบระเบียง", items: ["ราวกันตก", "ก๊อกซักล้าง"] }
];

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
  { id: 'mytree', name: 'บ้านมายทรี 48', floors: [{ level: 5, rooms: ['501','502','503','505','506','507','508','509','510','511','512','513','514','515'] }, { level: 4, rooms: ['401','402','403','405','406','407','408','409','410','411','412','413','414','415'] }, { level: 3, rooms: ['301','302','303','305','306','307','308','309','310','311','312','313','314','315'] }, { level: 2, rooms: ['201','202','203','205','206','207','208','209','210','211','212','213','214','215'] }, { level: 1, rooms: Array.from({ length: 11 }, (_, i) => `1${String(i + 1).padStart(2, '0')}`) }] },
  { 
    id: 'khunluang', 
    name: 'บ้านคุณหลวง', 
    floors: [
      { level: 4, rooms: Array.from({ length: 6 }, (_, i) => `4-${i + 1}`) }, 
      { level: 3, rooms: Array.from({ length: 12 }, (_, i) => `3-${i + 1}`) }, 
      { level: 2, rooms: Array.from({ length: 12 }, (_, i) => `2-${i + 1}`) }, 
      { level: 1, rooms: Array.from({ length: 18 }, (_, i) => `1-${i + 1}`) }
    ] 
  },
  { id: 'meesap', name: 'อพาร์ทเม้นท์มีทรัพย์', floors: Array.from({ length: 5 }, (_, i) => ({ level: 5 - i, rooms: Array.from({ length: 6 }, (_, j) => `${5 - i}.${j + 1}`) })) },
  { id: 'meethong', name: 'อพาร์ทเม้นท์มีทอง', floors: Array.from({ length: 5 }, (_, i) => { const lv = 5 - i; return { level: lv, rooms: lv === 1 ? Array.from({ length: 11 }, (_, j) => `${102 + j}`) : Array.from({ length: 13 }, (_, j) => `${lv}${String(j + 1).padStart(2, '0')}`) }; }) }
];

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [activePropertyId, setActivePropertyId] = useState(PROPERTIES[0].id);
  const [roomStates, setRoomStates] = useState({});
  const [tenantHistory, setTenantHistory] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [repairs, setRepairs] = useState({});
  const [qcStatus, setQcStatus] = useState({});
  const [procStatus, setProcStatus] = useState('pending');
  const [keyStatus, setKeyStatus] = useState('waiting');

  useEffect(() => {
    signInAnonymously(auth).then(() => {
      onSnapshot(collection(db, 'apartments', appId, 'rooms'), (snap) => {
        const data = {}; snap.forEach(d => { data[d.id] = d.data(); });
        setRoomStates(data);
      });
      onSnapshot(collection(db, 'apartments', appId, 'history'), (snap) => {
        const h = []; snap.forEach(d => h.push(d.data()));
        setTenantHistory(h.sort((a,b) => b.timestamp - a.timestamp));
      });
    });
  }, []);

  const activeProperty = PROPERTIES.find(p => p.id === activePropertyId);
  const stats = useMemo(() => {
    const s = { total: 0 }; Object.keys(STATUS_FLOW).forEach(k => s[k] = 0);
    activeProperty?.floors.forEach(f => f.rooms.forEach(r => {
      const room = roomStates[`${activePropertyId}_${r}`] || { status: 'rented' };
      s[room.status]++; s.total++;
    }));
    return s;
  }, [roomStates, activePropertyId, activeProperty]);

  const handleSave = async (mode) => {
    const docId = `${activePropertyId}_${selectedRoom}`;
    const info = roomStates[docId] || { status: 'rented' };
    const form = document.getElementById('modalForm');
    const formData = new FormData(form);
    const timestamp = Date.now();
    let updateData = { ...info, updatedAt: timestamp, propertyId: activePropertyId };

    if (mode === 'saveTenant') {
      updateData.status = 'rented';
      updateData.tenantName = formData.get('tName');
      updateData.tenantPhone = formData.get('tPhone');
      updateData.roomPrice = formData.get('rPrice');
      updateData.depositPrice = formData.get('dPrice');
      updateData.checkInDate = new Date().toLocaleDateString('th-TH');
      updateData.inCheckQC = qcStatus; 
      updateData.inCheckNote = formData.get('inCheckNote'); 
    } else if (mode === 'noticeOut') {
      await addDoc(collection(db, 'apartments', appId, 'history'), {
        roomNo: selectedRoom, propertyName: activeProperty.name,
        tenantName: info.tenantName, tenantPhone: info.tenantPhone,
        checkInDate: info.checkInDate, checkOutDate: new Date().toLocaleDateString('th-TH'),
        timestamp: timestamp
      });
      updateData.status = 'notice';
    } else if (mode === 'forward') {
      const cur = info.status;
      if (cur === 'notice' && keyStatus === 'waiting') return alert("รอกุญแจ!");
      updateData.status = STATUS_FLOW[cur]?.next || 'ready';
      if (formData.get('sDate')) updateData.sDate = formData.get('sDate');
      if (cur === 'notice') updateData.keyStatus = keyStatus;
      if (cur === 'pendingCheck') updateData.repairData = repairs;
      if (cur === 'finalQC') { updateData.qcData = qcStatus; updateData.qcNote = formData.get('qcNote'); }
      if (['cleaning', 'maintenance', 'cleaningPost'].includes(cur)) updateData[`${cur}_state`] = procStatus;
      if (updateData.status === 'ready') { 
        delete updateData.tenantName; delete updateData.tenantPhone; 
        delete updateData.repairData; delete updateData.qcData; 
        delete updateData.inCheckQC; delete updateData.inCheckNote;
      }
    }
    await setDoc(doc(db, 'apartments', appId, 'rooms', docId), updateData);
    setSelectedRoom(null); setRepairs({}); setQcStatus({}); setProcStatus('pending');
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-['Prompt'] text-center">
        <form onSubmit={(e) => { e.preventDefault(); pinInput === ACCESS_PIN ? setIsUnlocked(true) : alert('PIN ผิด!'); }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl space-y-6">
          <Lock size={48} className="mx-auto text-indigo-600" />
          <h2 className="text-xl font-black italic uppercase">Service Access</h2>
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl text-center text-4xl font-bold border-2 focus:border-indigo-500 outline-none" placeholder="PIN" />
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">LOGIN</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-['Prompt'] text-slate-800">
      <nav className="bg-white border-b p-4 sticky top-0 z-40 flex justify-between items-center px-6 shadow-sm">
        <div className="font-black text-indigo-600 italic flex items-center gap-2 text-xl"><Building2 size={24}/> APARTCLOUD</div>
        <div className="flex gap-4">
           <button onClick={()=>setViewMode('grid')} className={`flex items-center gap-2 font-bold text-[10px] ${viewMode==='grid'?'text-indigo-600':'text-slate-400'}`}><PieChart size={18}/> ผังห้อง</button>
           <button onClick={()=>setViewMode('archive')} className={`flex items-center gap-2 font-bold text-[10px] ${viewMode==='archive'?'text-indigo-600':'text-slate-400'}`}><Archive size={18}/> คลังข้อมูล</button>
           <button onClick={()=>setViewMode('history')} className={`flex items-center gap-2 font-bold text-[10px] ${viewMode==='history'?'text-indigo-600':'text-slate-400'}`}><History size={18}/> ประวัติลูกค้า</button>
           <button onClick={() => setIsUnlocked(false)} className="p-2 text-slate-300"><Unlock size={18}/></button>
        </div>
      </nav>

      <main className="p-4 max-w-7xl mx-auto space-y-6">
        {viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-4">
                <h2 className="font-black text-xs flex items-center gap-2 text-indigo-600 uppercase tracking-widest"><PieChart size={16}/> {activeProperty.name}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_FLOW).map(([k, v]) => (
                    <div key={k} className="p-3 bg-slate-50 rounded-2xl border text-center">
                      <p className="text-[8px] font-black uppercase text-slate-400 leading-none">{v.label}</p>
                      <p className="text-xl font-black text-slate-700 mt-1">{stats[k]} ห้อง</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white flex items-center relative overflow-hidden">
                <div className="space-y-2 relative z-10">
                   <h2 className="font-black text-xl italic flex items-center gap-2 uppercase tracking-tighter"><Bell size={24}/> Mission Control</h2>
                   <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest font-['Prompt']">ชั้น 7 บ้านมั่งมี และ บ้านคุณหลวง พร้อมใช้งาน!</p>
                </div>
              </div>
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
              {PROPERTIES.map(p => (
                <button key={p.id} onClick={() => setActivePropertyId(p.id)} className={`px-6 py-3 rounded-2xl border-2 font-black whitespace-nowrap transition-all ${activePropertyId === p.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{p.name}</button>
              ))}
            </div>

            {activeProperty?.floors.map(floor => (
              <div key={floor.level} className="space-y-4 font-['Prompt']">
                <h3 className="font-black text-slate-400 text-[10px] uppercase pl-2 font-bold tracking-widest">ชั้น {floor.level}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {floor.rooms.map(roomNo => {
                    const info = roomStates[`${activePropertyId}_${roomNo}`] || { status: 'rented' };
                    return (
                      <button key={roomNo} onClick={() => setSelectedRoom(roomNo)} className={`p-5 rounded-[1.8rem] font-black text-center shadow-sm border-b-4 border-black/10 transition-all active:scale-95 ${STATUS_FLOW[info.status]?.color || 'bg-slate-200'} text-white`}>
                        <div className="text-lg font-bold leading-none">{roomNo}</div>
                        <div className="text-[7px] uppercase opacity-70 mt-1 font-black tracking-tighter">{STATUS_FLOW[info.status]?.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : viewMode === 'archive' ? (
          <div className="space-y-6 font-['Prompt'] animate-in fade-in duration-300">
             <h2 className="text-3xl font-black italic text-indigo-600 flex items-center gap-3"><Archive size={32}/> ARCHIVE</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-4">
                   <h3 className="font-black text-rose-500 text-xs flex items-center gap-2 uppercase tracking-widest font-bold"><Wrench size={16}/> Repair History</h3>
                   <div className="space-y-3">
                      {Object.entries(roomStates).filter(([_,v])=>v.repairData).map(([id, data]) => (
                        <div key={id} className="p-4 bg-slate-50 rounded-2xl border">
                           <p className="font-black text-xs text-indigo-600 mb-2">ห้อง {id.split('_')[1]}</p>
                           {Object.entries(data.repairData).filter(([_,rd])=>rd.checked).map(([name, rd]) => (
                              <div key={name} className="flex justify-between text-[10px] font-bold py-1 border-b border-white"><span>• {name}</span><span className="text-rose-500">{rd.price}.-</span></div>
                           ))}
                        </div>
                      ))}
                   </div>
                </div>
                <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-4">
                   <h3 className="font-black text-indigo-500 text-xs flex items-center gap-2 uppercase tracking-widest font-bold"><ClipboardCheck size={16}/> QC History</h3>
                   <div className="space-y-3">
                      {Object.entries(roomStates).filter(([_,v])=>v.qcData || v.inCheckQC).map(([id, data]) => (
                        <div key={id} className="p-4 bg-slate-50 rounded-2xl border">
                           <p className="font-black text-xs text-indigo-600 mb-1 font-bold">ห้อง {id.split('_')[1]}</p>
                           {data.inCheckQC && <p className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">✓ ตรวจรับห้อง (In-Check) เรียบร้อย</p>}
                           {data.qcData && <p className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter">✓ ตรวจก่อนขาย (Final QC) เรียบร้อย</p>}
                           {data.inCheckNote && <p className="text-[8px] font-bold text-slate-400 italic mt-1 border-t pt-1">ย้ายเข้า: {data.inCheckNote}</p>}
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[3rem] border shadow-sm font-['Prompt']">
             <h2 className="text-3xl font-black italic text-indigo-600 mb-6 flex items-center gap-3"><History size={32}/> TENANT HISTORY</h2>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead><tr className="text-[10px] font-black text-slate-400 uppercase border-b"><th className="pb-4 px-4">ตึก/ห้อง</th><th className="pb-4 px-4">ชื่อ</th><th className="pb-4 text-center">เข้า-ออก</th><th className="pb-4 text-right">สถานะ</th></tr></thead>
                   <tbody>
                      {tenantHistory.map((h, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-all">
                          <td className="py-4 px-4 font-black text-sm">{h.roomNo}<br/><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{h.propertyName}</span></td>
                          <td className="py-4 px-4 font-bold text-xs">{h.tenantName}<br/><span className="text-[9px] text-slate-400">{h.tenantPhone}</span></td>
                          <td className="py-4 text-center text-[10px] font-black"><span className="text-emerald-500">{h.checkInDate}</span> - <span className="text-rose-500">{h.checkOutDate}</span></td>
                          <td className="py-4 text-right px-4"><span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Checked Out</span></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>

      {selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4 font-['Prompt']">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div><h3 className="text-3xl font-black italic text-indigo-600 leading-none">Room {selectedRoom}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{activeProperty.name}</p></div>
              <button onClick={() => setSelectedRoom(null)}><X size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <form id="modalForm">
              {(() => {
                const info = roomStates[`${activePropertyId}_${selectedRoom}`] || { status: 'rented' };
                const cur = info.status;

                if (cur === 'ready' || cur === 'rented') return (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 space-y-4">
                       <h4 className="font-black flex items-center gap-2 text-indigo-600 uppercase text-xs font-bold tracking-widest"><User size={18}/> ข้อมูลผู้เช่า</h4>
                       <div className="grid grid-cols-2 gap-3">
                          <input name="tName" defaultValue={info.tenantName} className="p-4 rounded-xl border-2 font-bold text-xs" placeholder="ชื่อ..." />
                          <input name="tPhone" defaultValue={info.tenantPhone} className="p-4 rounded-xl border-2 font-bold text-xs" placeholder="เบอร์..." />
                          <input name="rPrice" defaultValue={info.roomPrice} className="p-4 rounded-xl border-2 font-bold text-xs" placeholder="ค่าห้อง..." />
                          <input name="dPrice" defaultValue={info.depositPrice} className="p-4 rounded-xl border-2 font-bold text-xs" placeholder="ประกัน..." />
                       </div>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-3xl border-2 border-emerald-100 space-y-4">
                       <h4 className="font-black flex items-center gap-2 text-emerald-600 uppercase text-[10px] tracking-widest font-bold"><ListChecks size={18}/> QC ก่อนส่งมอบห้อง (In-Check)</h4>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {QC_LIST.map(g => g.items.map(it => (
                            <label key={it} className="flex items-center gap-3 bg-white p-3 rounded-xl border font-bold text-[9px] cursor-pointer hover:bg-emerald-50 transition-colors">
                              <input type="checkbox" className="w-4 h-4 rounded-lg border-2 text-emerald-500" checked={qcStatus[it] || (info.inCheckQC?.[it])} onChange={e => setQcStatus({...qcStatus, [it]: e.target.checked})} />
                              {it}
                            </label>
                          )))}
                       </div>
                       <textarea name="inCheckNote" defaultValue={info.inCheckNote || ""} placeholder="ระบุสภาพห้องเบื้องต้นตอนย้ายเข้า..." className="w-full p-4 h-24 rounded-2xl bg-white border-2 border-emerald-50 font-bold text-xs outline-none focus:border-emerald-300 resize-none font-['Prompt']"></textarea>
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                      <button type="button" onClick={()=>handleSave('saveTenant')} className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-lg uppercase active:scale-95 transition-all">บันทึกข้อมูลและ QC</button>
                      {cur === 'rented' && <button type="button" onClick={()=>handleSave('noticeOut')} className="flex-1 bg-rose-500 text-white py-5 rounded-2xl font-black shadow-lg uppercase active:scale-95 transition-all">แจ้งย้ายออก</button>}
                    </div>
                  </div>
                );

                if (cur === 'notice') return (
                  <div className="bg-orange-50 p-8 rounded-3xl border-2 border-orange-200 text-center space-y-6">
                    <Key size={64} className="mx-auto text-orange-400 animate-bounce" />
                    <h4 className="font-black text-2xl text-orange-600 italic tracking-tighter">Key Return</h4>
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>setKeyStatus('waiting')} className={`flex-1 py-5 rounded-2xl font-black border-2 ${keyStatus==='waiting'?'bg-orange-500 text-white shadow-md':'bg-white text-orange-300'}`}>รอกุญแจ</button>
                      <button type="button" onClick={()=>setKeyStatus('returned')} className={`flex-1 py-5 rounded-2xl font-black border-2 ${keyStatus==='returned'?'bg-green-500 text-white shadow-md':'bg-white text-green-300'}`}>คืนแล้ว</button>
                    </div>
                  </div>
                );

                if (cur === 'pendingCheck' || cur === 'finalQC' || ['cleaning', 'maintenance', 'cleaningPost'].includes(cur)) {
                   return (
                     <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 text-center space-y-6 shadow-inner font-['Prompt']">
                        <h4 className="font-black text-indigo-600 uppercase tracking-widest text-sm">{STATUS_FLOW[cur].label}</h4>
                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest"><p>Service Date</p><input type="date" name="sDate" required className="outline-none" /></div>
                        <div className="grid grid-cols-3 gap-2">
                           {['pending', 'doing', 'done'].map(s => ( <button key={s} type="button" onClick={() => setProcStatus(s)} className={`py-4 rounded-xl font-black text-xs border-2 ${procStatus===s ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-300'}`}>{s==='pending'?'ยังไม่ทำ':s==='doing'?'กำลังทำ':'เสร็จแล้ว'}</button> ))}
                        </div>
                        {cur === 'pendingCheck' && (
                          <div className="text-left space-y-4 pt-4 border-t">
                            {Object.entries(REPAIR_ITEMS_GENERAL).map(([group, items]) => (
                               <div key={group} className="space-y-2">
                                 <p className="text-[10px] font-black text-rose-300 uppercase px-2">{group}</p>
                                 {items.map(it => (
                                   <div key={it} className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                                     <label className="flex items-center gap-3 font-bold text-xs"><input type="checkbox" className="w-5 h-5 rounded-lg border-2 text-rose-500" onChange={e => setRepairs({...repairs, [it]: {...repairs[it], checked: e.target.checked}})} />{it}</label>
                                     {repairs[it]?.checked && (
                                       <div className="flex gap-2"><input placeholder="ราคา" className="w-24 p-3 bg-slate-50 rounded-xl border-2 text-[10px] font-black" onChange={e => setRepairs({...repairs, [it]: {...repairs[it], price: e.target.value}})} /><input placeholder="โน้ต" className="flex-1 p-3 bg-slate-50 rounded-xl border-2 text-[10px] font-bold" onChange={e => setRepairs({...repairs, [it]: {...repairs[it], note: e.target.value}})} /></div>
                                     )}
                                   </div>
                                 ))}
                               </div>
                             ))}
                          </div>
                        )}
                        {cur === 'finalQC' && <textarea name="qcNote" placeholder="รายละเอียดเพิ่มเติมหลังซ่อม..." className="w-full p-4 h-32 rounded-2xl border-2 font-bold text-xs outline-none focus:border-indigo-400"></textarea>}
                     </div>
                   );
                }
                return null;
              })()}
              </form>
            </div>
            <div className="p-8 border-t bg-white">
              {!['ready', 'rented'].includes(roomStates[`${activePropertyId}_${selectedRoom}`]?.status || 'rented') && (
                <button type="button" onClick={() => handleSave('forward')} className="w-full bg-slate-900 text-white py-6 rounded-[2.2rem] font-black text-xl shadow-xl uppercase active:scale-95 transition-all">
                  บันทึกสเตปถัดไป <CheckCircle2 />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}