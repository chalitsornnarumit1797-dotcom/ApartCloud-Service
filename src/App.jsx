import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Building2, X, Clock, Wrench, Sparkles, ClipboardCheck, Lock, Unlock, User, DollarSign, CheckCircle2, Key, Calendar, Save, LogOut, AlertCircle, FileText, PieChart, Bell, History, Archive, Trash2 } from 'lucide-react';

// --- Config & Firebase ---
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
      { level: 7, rooms: Array.from({ length: 18 }, (_, i) => `7${String(i + 1).padStart(2, '0')}`) }, // เพิ่มชั้น 7 แล้ว
      { level: 6, rooms: Array.from({ length: 18 }, (_, i) => `6${String(i + 1).padStart(2, '0')}`) }, 
      { level: 5, rooms: Array.from({ length: 18 }, (_, i) => `5${String(i + 1).padStart(2, '0')}`) }, 
      { level: 4, rooms: Array.from({ length: 18 }, (_, i) => `4${String(i + 1).padStart(2, '0')}`) }, 
      { level: 3, rooms: Array.from({ length: 18 }, (_, i) => `3${String(i + 1).padStart(2, '0')}`) }, 
      { level: 2, rooms: Array.from({ length: 18 }, (_, i) => `2${String(i + 1).padStart(2, '0')}`) }
    ],
    prices: "3,500 - 4,500"
  },
  { id: 'mytree', name: 'บ้านมายทรี 48', floors: [{ level: 5, rooms: ['501','502','503','505','506','507','508','509','510','511','512','513','514','515'] }, { level: 4, rooms: ['401','402','403','405','406','407','408','409','410','411','412','413','414','415'] }, { level: 3, rooms: ['301','302','303','305','306','307','308','309','310','311','312','313','314','315'] }, { level: 2, rooms: ['201','202','203','205','206','207','208','209','210','211','212','213','214','215'] }, { level: 1, rooms: Array.from({ length: 11 }, (_, i) => `1${String(i + 1).padStart(2, '0')}`) }], prices: "4,000 - 5,500" },
  { id: 'khunluang', name: 'บ้านคุณหลวง', floors: [{ level: 4, rooms: Array.from({ length: 6 }, (_, i) => `4/${i + 1}`) }, { level: 3, rooms: Array.from({ length: 12 }, (_, i) => `3/${i + 1}`) }, { level: 2, rooms: Array.from({ length: 12 }, (_, i) => `2/${i + 1}`) }, { level: 1, rooms: Array.from({ length: 18 }, (_, i) => `1/${i + 1}`) }], prices: "3,000 - 4,200" },
  { id: 'meesap', name: 'อพาร์ทเม้นท์มีทรัพย์', floors: Array.from({ length: 5 }, (_, i) => ({ level: 5 - i, rooms: Array.from({ length: 6 }, (_, j) => `${5 - i}.${j + 1}`) })), prices: "3,200 - 3,800" },
  { id: 'meethong', name: 'อพาร์ทเม้นท์มีทอง', floors: Array.from({ length: 5 }, (_, i) => { const lv = 5 - i; return { level: lv, rooms: lv === 1 ? Array.from({ length: 11 }, (_, j) => `${102 + j}`) : Array.from({ length: 13 }, (_, j) => `${lv}${String(j + 1).padStart(2, '0')}`) }; }), prices: "3,800 - 4,800" }
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

  const handleResetSystem = async () => {
    if (!window.confirm("⚠️ ยืนยันการล้างข้อมูลระบบ? ประวัติและสถานะทั้งหมดจะหายไป")) return;
    const historySnap = await getDocs(collection(db, 'apartments', appId, 'history'));
    historySnap.forEach(async (d) => await deleteDoc(doc(db, 'apartments', appId, 'history', d.id)));
    const roomSnap = await getDocs(collection(db, 'apartments', appId, 'rooms'));
    roomSnap.forEach(async (d) => { await setDoc(doc(db, 'apartments', appId, 'rooms', d.id), { status: 'rented', updatedAt: Date.now() }); });
    alert("Reset Complete");
    setViewMode('grid');
  };

  const handleSave = async (mode) => {
    const docId = `${activePropertyId}_${selectedRoom}`;
    const info = roomStates[docId] || { status: 'rented' };
    const formData = new FormData(document.getElementById('modalForm'));
    const timestamp = Date.now();
    let updateData = { ...info, updatedAt: timestamp, propertyId: activePropertyId };

    if (mode === 'saveTenant') {
      updateData.status = 'rented';
      updateData.tenantName = formData.get('tName');
      updateData.tenantPhone = formData.get('tPhone');
      updateData.roomPrice = formData.get('rPrice');
      updateData.depositPrice = formData.get('dPrice');
      updateData.checkInDate = new Date().toLocaleDateString('th-TH');
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
      if (updateData.status === 'ready') { delete updateData.tenantName; delete updateData.tenantPhone; delete updateData.repairData; delete updateData.qcData; }
    }
    await setDoc(doc(db, 'apartments', appId, 'rooms', docId), updateData);
    setSelectedRoom(null); setRepairs({}); setQcStatus({}); setProcStatus('pending');
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-['Prompt']">
        <form onSubmit={(e) => { e.preventDefault(); pinInput === ACCESS_PIN ? setIsUnlocked(true) : alert('PIN!'); }} className="bg-white p-10 rounded-[3rem] w-full max-w-sm shadow-2xl text-center space-y-6">
          <Wrench size={48} className="mx-auto text-indigo-600" />
          <h2 className="text-xl font-black italic">SERVICE HUB</h2>
          <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} className="w-full p-4 bg-slate-100 rounded-2xl text-center text-4xl font-bold border-2 focus:border-indigo-500 outline-none" placeholder="PIN" />
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black">LOGIN</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10 font-['Prompt'] text-slate-800">
      <nav className="bg-white border-b p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm px-6">
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
                <h2 className="font-black text-[10px] flex items-center gap-2 text-indigo-600 uppercase tracking-widest"><PieChart size={14}/> {activeProperty.name}</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_FLOW).map(([k, v]) => (
                    <div key={k} className="p-3 bg-slate-50 rounded-2xl border text-center">
                      <p className="text-[8px] font-black uppercase text-slate-400 leading-none">{v.label}</p>
                      <p className="text-xl font-black text-slate-700 mt-1">{stats[k]} ห้อง</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-2 bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl text-white flex items-center">
                <div className="space-y-2">
                   <h2 className="font-black text-xl italic flex items-center gap-2"><Bell size={24}/> MISSION CONTROL</h2>
                   <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest">ชั้น 7 บ้านมั่งมี พร้อมใช้งานแล้ว</p>
                </div>
              </div>
            </div>

            <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
              {PROPERTIES.map(p => (
                <button key={p.id} onClick={() => setActivePropertyId(p.id)} className={`px-6 py-3 rounded-2xl border-2 font-black whitespace-nowrap transition-all ${activePropertyId === p.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100'}`}>{p.name}</button>
              ))}
            </div>

            {activeProperty?.floors.map(floor => (
              <div key={floor.level} className="space-y-4">
                <h3 className="font-black text-slate-400 text-[10px] uppercase pl-2">ชั้น {floor.level}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {floor.rooms.map(roomNo => {
                    const info = roomStates[`${activePropertyId}_${roomNo}`] || { status: 'rented' };
                    return (
                      <button key={roomNo} onClick={() => setSelectedRoom(roomNo)} className={`p-5 rounded-[1.8rem] font-black text-center shadow-sm border-b-4 border-black/10 transition-all active:scale-95 ${STATUS_FLOW[info.status]?.color || 'bg-slate-200'} text-white`}>
                        <div className="text-lg font-bold leading-none">{roomNo}</div>
                        <div className="text-[7px] uppercase opacity-70 mt-1 font-black">{STATUS_FLOW[info.status]?.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        ) : viewMode === 'archive' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center px-4">
               <h2 className="text-3xl font-black italic text-indigo-600 flex items-center gap-3"><Archive size={32}/> ARCHIVE</h2>
               <button onClick={handleResetSystem} className="bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14}/> RESET SYSTEM</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-4 h-[60vh] overflow-y-auto">
                <h3 className="font-black text-rose-500 text-xs flex items-center gap-2 uppercase tracking-widest"><Wrench size={16}/> Repair History</h3>
                {Object.entries(roomStates).filter(([_,v])=>v.repairData).map(([id, data]) => (
                    <div key={id} className="p-4 bg-slate-50 rounded-2xl border mb-3">
                      <p className="font-black text-xs text-indigo-600 mb-2">ห้อง {id.split('_')[1]}</p>
                      {Object.entries(data.repairData).filter(([_,rd])=>rd.checked).map(([name, rd]) => (
                          <div key={name} className="flex justify-between text-[10px] font-bold py-0.5 border-b border-slate-100">
                            <span>• {name}</span><span className="text-rose-500">{rd.price}.-</span>
                          </div>
                      ))}
                    </div>
                ))}
              </div>
              <div className="bg-white p-8 rounded-[3rem] border shadow-sm space-y-4 h-[60vh] overflow-y-auto">
                <h3 className="font-black text-indigo-500 text-xs flex items-center gap-2 uppercase tracking-widest"><ClipboardCheck size={16}/> QC History</h3>
                {Object.entries(roomStates).filter(([_,v])=>v.qcData).map(([id, data]) => (
                    <div key={id} className="p-4 bg-slate-50 rounded-2xl border mb-3">
                      <p className="font-black text-xs text-indigo-600 mb-2">ห้อง {id.split('_')[1]}</p>
                      <p className="text-[9px] font-bold text-emerald-600 italic">ผ่าน QC 6 หมวดหลัก</p>
                      {data.qcNote && <p className="text-[9px] font-bold text-slate-400 mt-2 bg-white p-2 rounded-lg border">โน้ต: {data.qcNote}</p>}
                    </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-[3rem] border shadow-sm animate-in fade-in duration-300">
             <h2 className="text-3xl font-black italic text-indigo-600 flex items-center gap-3 mb-6"><History size={32}/> TENANT HISTORY</h2>
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b"><th className="pb-4 px-4">ห้อง/ตึก</th><th className="pb-4 px-4">ชื่อ</th><th className="pb-4 px-4 text-center">เข้า-ออก</th><th className="pb-4 px-4 text-right">สถานะ</th></tr></thead>
                   <tbody>
                      {tenantHistory.map((h, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50 transition-all">
                          <td className="py-4 px-4 font-black text-sm">{h.roomNo}<br/><span className="text-[9px] text-slate-400 font-bold">{h.propertyName}</span></td>
                          <td className="py-4 px-4 font-bold text-xs">{h.tenantName}<br/><span className="text-[9px] text-slate-400">{h.tenantPhone}</span></td>
                          <td className="py-4 px-4 text-center text-[10px] font-black"><span className="text-emerald-500">{h.checkInDate}</span> - <span className="text-rose-500">{h.checkOutDate}</span></td>
                          <td className="py-4 px-4 text-right"><span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[9px] font-black uppercase">Checked Out</span></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>

      {selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in duration-200">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div><h3 className="text-3xl font-black italic text-indigo-600">Room {selectedRoom}</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{activeProperty.name}</p></div>
              <button onClick={() => setSelectedRoom(null)}><X size={32}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8">
              <form id="modalForm">
              {(() => {
                const info = roomStates[`${activePropertyId}_${selectedRoom}`] || { status: 'rented' };
                const cur = info.status;

                if (cur === 'ready' || cur === 'rented') return (
                  <div className="space-y-6">
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 space-y-4 shadow-inner">
                       <h4 className="font-black flex items-center gap-2 text-indigo-600"><User size={18}/> ข้อมูลผู้เช่า</h4>
                       <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1"><p className="text-[9px] font-black px-2 text-slate-400 uppercase">ชื่อ</p><input name="tName" defaultValue={info.tenantName} className="w-full p-4 rounded-xl border-2 font-bold focus:border-indigo-500 outline-none" /></div>
                          <div className="space-y-1"><p className="text-[9px] font-black px-2 text-slate-400 uppercase">เบอร์</p><input name="tPhone" defaultValue={info.tenantPhone} className="w-full p-4 rounded-xl border-2 font-bold focus:border-indigo-500 outline-none" /></div>
                          <div className="space-y-1"><p className="text-[9px] font-black px-2 text-slate-400 uppercase">ค่าห้อง</p><input name="rPrice" defaultValue={info.roomPrice} className="w-full p-4 rounded-xl border-2 font-bold focus:border-indigo-500 outline-none" /></div>
                          <div className="space-y-1"><p className="text-[9px] font-black px-2 text-slate-400 uppercase">ประกัน</p><input name="dPrice" defaultValue={info.depositPrice} className="w-full p-4 rounded-xl border-2 font-bold focus:border-indigo-500 outline-none" /></div>
                       </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t">
                      <button type="button" onClick={()=>handleSave('saveTenant')} className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">บันทึกข้อมูล</button>
                      {cur === 'rented' && <button type="button" onClick={()=>handleSave('noticeOut')} className="flex-1 bg-rose-500 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-rose-600 transition-all">แจ้งย้ายออก</button>}
                    </div>
                  </div>
                );

                if (cur === 'notice') return (
                  <div className="bg-orange-50 p-8 rounded-3xl border-2 border-orange-200 text-center space-y-6">
                    <Key size={64} className="mx-auto text-orange-400" />
                    <h4 className="font-black text-2xl text-orange-600 italic">Key Return Status</h4>
                    <div className="flex gap-2">
                      <button type="button" onClick={()=>setKeyStatus('waiting')} className={`flex-1 py-5 rounded-2xl font-black border-2 transition-all ${keyStatus==='waiting'?'bg-orange-500 text-white border-orange-500 shadow-lg':'bg-white text-orange-300'}`}>รอกุญแจ</button>
                      <button type="button" onClick={()=>setKeyStatus('returned')} className={`flex-1 py-5 rounded-2xl font-black border-2 transition-all ${keyStatus==='returned'?'bg-green-500 text-white border-green-500 shadow-lg':'bg-white text-green-300'}`}>คืนแล้ว</button>
                    </div>
                  </div>
                );

                if (cur === 'pendingCheck') return (
                  <div className="bg-rose-50 p-6 rounded-3xl border-2 border-rose-100 space-y-6">
                     <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm font-black text-xs mb-4 uppercase tracking-widest"><p className="text-rose-500">Inspection Date</p><input type="date" name="sDate" className="outline-none" required /></div>
                     {Object.entries(REPAIR_ITEMS_GENERAL).map(([group, items]) => (
                       <div key={group} className="space-y-2">
                         <p className="text-[10px] font-black text-rose-300 uppercase px-2 tracking-widest">{group}</p>
                         {items.map(it => (
                           <div key={it} className="bg-white p-4 rounded-2xl border shadow-sm space-y-3">
                             <label className="flex items-center gap-3 font-bold text-xs cursor-pointer"><input type="checkbox" className="w-5 h-5 rounded-lg border-2 text-rose-500" onChange={e => setRepairs({...repairs, [it]: {...repairs[it], checked: e.target.checked}})} />{it}</label>
                             {repairs[it]?.checked && (
                               <div className="flex gap-2 animate-in slide-in-from-top-1"><input placeholder="ราคา" className="w-24 p-3 bg-slate-50 rounded-xl border-2 text-[10px] font-black focus:border-rose-200 outline-none" onChange={e => setRepairs({...repairs, [it]: {...repairs[it], price: e.target.value}})} /><input placeholder="โน้ต" className="flex-1 p-3 bg-slate-50 rounded-xl border-2 text-[10px] font-bold focus:border-rose-200 outline-none" onChange={e => setRepairs({...repairs, [it]: {...repairs[it], note: e.target.value}})} /></div>
                             )}
                           </div>
                         ))}
                       </div>
                     ))}
                  </div>
                );

                if (cur === 'maintenance') {
                   const items = Object.entries(info.repairData || {}).filter(([_,v])=>v.checked);
                   return (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center bg-amber-100 p-4 rounded-2xl border border-amber-200 text-xs font-black uppercase"><p>Repair Date</p><input type="date" name="sDate" className="bg-transparent font-bold outline-none"/></div>
                        <div className="bg-amber-50 p-6 rounded-3xl border-2 border-amber-200 space-y-4 shadow-sm">
                           <h4 className="font-black text-amber-600 text-xs tracking-widest uppercase">รายการซ่อมที่ระบุไว้</h4>
                           {items.map(([name, val]) => (
                             <div key={name} className="bg-white p-4 rounded-2xl border-2 border-amber-100 flex justify-between items-center text-xs">
                                <div><p className="font-black">{name}</p><p className="text-[10px] text-amber-500 font-bold italic">โน้ต: {val.note || '-'}</p></div>
                                <div className="text-rose-500 font-black">{val.price || '0'}.-</div>
                             </div>
                           ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                           {['pending', 'doing', 'done'].map(s => ( <button key={s} type="button" onClick={() => setProcStatus(s)} className={`py-4 rounded-xl font-black text-xs border-2 transition-all ${procStatus===s ? 'bg-amber-500 text-white border-amber-500 shadow-md' : 'bg-white text-amber-300'}`}>{s==='pending'?'ยังไม่ทำ':s==='doing'?'กำลังทำ':'เสร็จแล้ว'}</button> ))}
                        </div>
                     </div>
                   );
                }

                if (cur === 'finalQC') return (
                  <div className="bg-indigo-50 p-6 rounded-[2.5rem] border-2 border-indigo-100 space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border text-xs font-black shadow-sm uppercase"><p className="text-indigo-600">QC Date</p><input type="date" name="sDate" className="outline-none" required /></div>
                    {QC_LIST.map(g => (
                      <div key={g.group} className="space-y-2">
                        <p className="text-[10px] font-black text-indigo-300 uppercase px-2 tracking-widest">{g.group}</p>
                        {g.items.map(it => ( <label key={it} className="flex items-center gap-3 bg-white p-4 rounded-xl border font-bold text-xs shadow-sm cursor-pointer hover:bg-indigo-50"><input type="checkbox" className="w-5 h-5 rounded-lg border-2" onChange={e => setQcStatus({...qcStatus, [it]: e.target.checked})} />{it}</label> ))}
                      </div>
                    ))}
                    <div className="bg-white p-4 rounded-3xl border shadow-sm space-y-2">
                       <h4 className="font-black text-indigo-600 text-[10px] flex items-center gap-2 px-2 uppercase tracking-widest"><FileText size={14}/> รายละเอียดเพิ่มเติม</h4>
                       <textarea name="qcNote" defaultValue={info.qcNote || ""} placeholder="..." className="w-full p-4 h-32 rounded-2xl bg-slate-50 border-2 font-bold text-xs outline-none focus:border-indigo-400"></textarea>
                    </div>
                  </div>
                );

                if (['cleaning', 'cleaningPost'].includes(cur)) return (
                  <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 space-y-6 text-center shadow-inner">
                    <h4 className="font-black text-indigo-600 uppercase tracking-widest text-xs">{STATUS_FLOW[cur].label}</h4>
                    <div className="flex justify-between items-center bg-white p-4 rounded-2xl border font-black text-xs uppercase"><p>Service Date</p><input type="date" name="sDate" required /></div>
                    <div className="grid grid-cols-3 gap-2">
                      {['pending', 'doing', 'done'].map(s => ( <button key={s} type="button" onClick={() => setProcStatus(s)} className={`py-4 rounded-xl font-black text-xs border-2 transition-all ${procStatus===s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-300'}`}>{s==='pending'?'ยังไม่ทำ':s==='doing'?'กำลังทำ':'เสร็จแล้ว'}</button> ))}
                    </div>
                  </div>
                );
                return null;
              })()}
              </form>
            </div>
            <div className="p-8 border-t bg-white">
              {!['ready', 'rented'].includes(roomStates[`${activePropertyId}_${selectedRoom}`]?.status || 'rented') && (
                <button type="button" onClick={() => handleSave('forward')} className="w-full bg-slate-900 text-white py-6 rounded-[2.2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 uppercase active:scale-95 transition-all">
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