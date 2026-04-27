import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, addDoc, query, where, orderBy, limit, runTransaction } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Building2, X, Clock, Wrench, ClipboardCheck, Lock, Unlock, User, Users, CheckCircle2, Key, Archive, LayoutGrid, UserCheck, Sparkles, Wind, Tablet as WashingMachine, Calendar, AlertTriangle, Settings, Camera, Phone, BookOpen, History, Save, Info, Bell, Hammer, Activity, ShieldCheck, Tag, ShoppingBag, BarChart3, ShoppingCart, ChevronRight, Monitor, Banknote, CreditCard, Package, ArrowRightLeft } from 'lucide-react';
import Inventory from './pages/Inventory';
import Facility from './pages/Facility';

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

const MAINTENANCE_ACCESS_LABEL = {
  allow: 'อนุญาตให้เข้า',
  knock: 'เคาะประตูก่อน',
  deny: 'ไม่อนุญาต'
};

const FRIDGE_ASSET_TYPE = 'refrigerator';
const GLOBAL_REFRIGERATORS_COLLECTION = 'refrigerators';

async function reserveFirstAvailableFridge(dbConn, orderedAssetIds, roomDocId, buildingId, roomNo) {
  let assignedId = null;
  await runTransaction(dbConn, async (tx) => {
    for (const assetId of orderedAssetIds) {
      const ref = doc(dbConn, GLOBAL_REFRIGERATORS_COLLECTION, assetId);
      const snap = await tx.get(ref);
      if (!snap.exists()) continue;
      const d = snap.data();
      if (d.type !== FRIDGE_ASSET_TYPE || d.status !== 'available') continue;
      tx.update(ref, {
        status: 'rented',
        assignedRoomKey: roomDocId,
        currentBuilding: buildingId || null,
        currentRoom: roomNo || null,
        updatedAt: new Date().toISOString()
      });
      assignedId = assetId;
      break;
    }
  });
  return assignedId;
}

async function releaseFridgeAsset(dbConn, assetId) {
  if (!assetId) return;
  const ref = doc(dbConn, GLOBAL_REFRIGERATORS_COLLECTION, assetId);
  await runTransaction(dbConn, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    tx.update(ref, {
      status: 'available',
      assignedRoomKey: null,
      currentBuilding: null,
      currentRoom: null,
      updatedAt: new Date().toISOString()
    });
  });
}

async function syncFridgeAssetWithRoomStatus(dbConn, roomDocId, roomInfo) {
  const refrigeratorAssetId = roomInfo?.refrigeratorAssetId;
  if (!refrigeratorAssetId) return;

  const ref = doc(dbConn, GLOBAL_REFRIGERATORS_COLLECTION, refrigeratorAssetId);
  await runTransaction(dbConn, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;

    const current = snap.data();
    tx.update(ref, {
      ...current,
      status: roomInfo?.status === 'rented' ? 'rented' : current.status,
      assignedRoomKey: roomDocId,
      currentBuilding: roomInfo?.propertyId || current.currentBuilding || null,
      currentRoom: roomDocId.split('_')[1] || current.currentRoom || null,
      updatedAt: new Date().toISOString()
    });
  });
}

function maintenanceDateYmd(value) {
  if (value == null || value === '') return '';
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  if (typeof value === 'string') return value.slice(0, 10);
  return '';
}

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
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [assets, setAssets] = useState({});
  const [repairLogModal, setRepairLogModal] = useState(null); // null | 'air' | 'wm'
  const [repairLogForm, setRepairLogForm] = useState({
    date: new Date().toISOString().split('T')[0],
    roomOrBuilding: '',
    details: '',
    access: 'allow',
    actualCost: '',
    customerCharge: '',
    newEquipmentPrice: ''
  });
  const [inventoryTransferAssetId, setInventoryTransferAssetId] = useState('');

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
      onSnapshot(collection(db, 'apartments', appId, 'maintenance_logs'), (snap) => {
        const rows = [];
        snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
        setMaintenanceLogs(rows);
      });
      onSnapshot(collection(db, GLOBAL_REFRIGERATORS_COLLECTION), (snap) => {
        const data = {};
        snap.forEach((d) => {
          data[d.id] = d.data();
        });
        setAssets(data);
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
      if (v.propertyId === activePropertyId && v.status === 'maintenance') {
        list.repair.push({ key: `room-${k}`, label: k.split('_')[1] });
      }
    });
    maintenanceLogs.forEach((log) => {
      if (log.propertyId !== activePropertyId) return;
      const logDate = maintenanceDateYmd(log.date);
      if (logDate !== today) return;
      const tag = log.category === 'air' ? 'แอร์' : 'ซักผ้า';
      list.repair.push({
        key: `log-${log.id}`,
        label: `${log.roomOrBuilding || '-'} (${tag})`
      });
    });
    Object.entries(airPlans).forEach(([k, v]) => {
      if (k.startsWith(activePropertyId) && v.date === today && !v.done) list.air.push(k.split('_')[1]);
    });
    if (wmPlans[`${activePropertyId}_COMMON`] && !wmPlans[`${activePropertyId}_COMMON`].done) list.wm = true;
    return list;
  }, [roomStates, airPlans, wmPlans, activePropertyId, maintenanceLogs]);

  const maintenanceTotals = useMemo(() => {
    const logs = maintenanceLogs.filter((l) => l.propertyId === activePropertyId);
    const totalCost = logs.reduce((s, l) => s + (Number(l.actualCost) || 0), 0);
    const totalCharge = logs.reduce((s, l) => s + (Number(l.customerCharge) || 0), 0);
    return { totalCost, totalCharge, profit: totalCharge - totalCost };
  }, [maintenanceLogs, activePropertyId]);

  const propertyMaintenanceLogsSorted = useMemo(() => {
    return maintenanceLogs
      .filter((l) => l.propertyId === activePropertyId)
      .slice()
      .sort((a, b) => {
        const da = maintenanceDateYmd(a.date);
        const db = maintenanceDateYmd(b.date);
        if (da !== db) return db.localeCompare(da);
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
  }, [maintenanceLogs, activePropertyId]);

  /** ทุนสะสมจริงถึงรายการนั้น ต่อคู่ (หมวด + ห้อง/ตึก) เรียงจากเก่าไปใหม่ — ใช้เทียบราคาเครื่องใหม่ */
  const maintenanceCumulativeByLogId = useMemo(() => {
    const asc = maintenanceLogs
      .filter((l) => l.propertyId === activePropertyId)
      .slice()
      .sort((a, b) => {
        const da = maintenanceDateYmd(a.date);
        const db = maintenanceDateYmd(b.date);
        if (da !== db) return da.localeCompare(db);
        return (a.createdAt || '').localeCompare(b.createdAt || '');
      });
    const running = new Map();
    const byLogId = new Map();
    for (const log of asc) {
      const assetKey = `${log.category || ''}|${(log.roomOrBuilding || '').trim()}`;
      const prev = running.get(assetKey) || 0;
      const next = prev + (Number(log.actualCost) || 0);
      running.set(assetKey, next);
      byLogId.set(log.id, next);
    }
    return byLogId;
  }, [maintenanceLogs, activePropertyId]);

  const fridgeStockByProperty = useMemo(() => {
    const byProp = {};
    Object.values(assets).forEach((a) => {
      if (a.type !== FRIDGE_ASSET_TYPE) return;
      const building = a.currentBuilding || a.propertyId;
      if (!building) return;
      if (!byProp[building]) byProp[building] = { available: 0, rented: 0, maintenance: 0 };
      if (a.status === 'available') byProp[building].available += 1;
      else if (a.status === 'rented') byProp[building].rented += 1;
      else if (a.status === 'maintenance') byProp[building].maintenance += 1;
    });
    return byProp;
  }, [assets]);

  const activeFridgeStock = fridgeStockByProperty[activePropertyId] || { available: 0, rented: 0, maintenance: 0 };

  const fridgeInventorySummary = useMemo(() => {
    return Object.values(assets).reduce((acc, a) => {
      if (a.type !== FRIDGE_ASSET_TYPE) return acc;
      acc.total += 1;
      if (a.status === 'available') acc.available += 1;
      else if (a.status === 'rented') acc.rented += 1;
      else if (a.status === 'maintenance') acc.maintenance += 1;
      return acc;
    }, { total: 0, available: 0, rented: 0, maintenance: 0 });
  }, [assets]);

  const getSortedAvailableFridgeIds = () =>
    Object.entries(assets)
      .filter(([, a]) => a.type === FRIDGE_ASSET_TYPE && a.status === 'available')
      .map(([id]) => id)
      .sort();

  const handleConfirmFridgeInRoom = async () => {
    const docId = `${activePropertyId}_${selectedRoom}`;
    const info = roomStates[docId] || {};
    if (userRole !== 'sales') return;
    if (info.refrigeratorStatus !== 'requested' || !info.refrigeratorAssetId) return;
    const timestamp = new Date().toLocaleString('th-TH');
    await setDoc(doc(db, 'apartments', appId, 'rooms', docId), {
      ...info,
      refrigeratorStatus: 'installed',
      refrigeratorReadyAt: timestamp,
      lastUpdateBy: 'ฝ่ายขาย (Sales)',
      lastUpdateTime: timestamp,
      propertyId: activePropertyId
    });
    alert('บันทึกแล้ว: ตู้เย็นพร้อมในห้อง');
  };

  const addFridgeAsset = async () => {
    if (userRole !== 'engineer') return;
    const assetId = (window.prompt('Asset ID (เช่น FR-001)') ?? '').trim();
    const brand = (window.prompt('Brand (ยี่ห้อ)') ?? '').trim();
    const size = (window.prompt('Size (ขนาด เช่น 7.4Q)') ?? '').trim();
    const label = window.prompt('ชื่อแสดงผล (ไม่บังคับ)') ?? '';
    await addDoc(collection(db, GLOBAL_REFRIGERATORS_COLLECTION), {
      type: FRIDGE_ASSET_TYPE,
      assetId: assetId || undefined,
      brand: brand || '-',
      size: size || '-',
      status: 'available',
      label: label.trim() || 'ตู้เย็นเช่า',
      assignedRoomKey: null,
      currentBuilding: null,
      currentRoom: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const setFridgeAssetStatus = async (assetId, nextStatus) => {
    if (userRole !== 'engineer' || !assetId) return;
    const cur = assets[assetId] || {};
    if (cur.status === 'rented') {
      alert('ตู้นี้ถูกผูกกับห้องอยู่ — ยกเลิกเช่าที่ห้องก่อนจึงจะเปลี่ยนสถานะได้');
      return;
    }
    await setDoc(doc(db, GLOBAL_REFRIGERATORS_COLLECTION, assetId), {
      ...cur,
      status: nextStatus,
      currentRoom: nextStatus === 'available' ? null : cur.currentRoom || null,
      updatedAt: new Date().toISOString()
    });
  };

  const transferFridgeAsset = async () => {
    if (userRole !== 'engineer') return;
    const searchValue = (inventoryTransferAssetId || '').trim();
    const matchedEntry = Object.entries(assets).find(([id, a]) => id === searchValue || a.assetId === searchValue);
    const assetId = matchedEntry?.[0];
    if (!assetId || !assets[assetId]) {
      alert('ไม่พบ Asset ที่ต้องการโอน');
      return;
    }
    const nextBuilding = (window.prompt('ย้ายไปอาคาร (property id เช่น mangmee/mytree/khunluang/meesap/meethong)') ?? '').trim();
    const nextRoom = (window.prompt('ย้ายไปห้อง (ปล่อยว่างได้)') ?? '').trim();
    if (!nextBuilding) {
      alert('กรุณาระบุอาคารปลายทาง');
      return;
    }
    const cur = assets[assetId];
    await setDoc(doc(db, GLOBAL_REFRIGERATORS_COLLECTION, assetId), {
      ...cur,
      currentBuilding: nextBuilding,
      currentRoom: nextRoom || null,
      assignedRoomKey: nextRoom ? `${nextBuilding}_${nextRoom}` : null,
      updatedAt: new Date().toISOString()
    });
    setInventoryTransferAssetId('');
  };

  const openRepairLogModal = (category) => {
    setRepairLogForm({
      date: new Date().toISOString().split('T')[0],
      roomOrBuilding: '',
      details: '',
      access: 'allow',
      actualCost: '',
      customerCharge: '',
      newEquipmentPrice: ''
    });
    setRepairLogModal(category);
  };

  const submitMaintenanceLog = async () => {
    if (!repairLogModal) return;
    const actual = Number(String(repairLogForm.actualCost || 0).replace(/,/g, '')) || 0;
    const charge = Number(String(repairLogForm.customerCharge || 0).replace(/,/g, '')) || 0;
    const newPrice = Number(String(repairLogForm.newEquipmentPrice || 0).replace(/,/g, '')) || 0;
    if (!repairLogForm.roomOrBuilding.trim()) {
      alert('กรุณาระบุเลขห้อง/ตึก');
      return;
    }
    await addDoc(collection(db, 'apartments', appId, 'maintenance_logs'), {
      propertyId: activePropertyId,
      category: repairLogModal,
      date: repairLogForm.date,
      roomOrBuilding: repairLogForm.roomOrBuilding.trim(),
      details: repairLogForm.details.trim(),
      access: repairLogForm.access,
      actualCost: actual,
      customerCharge: charge,
      newEquipmentPrice: newPrice,
      createdAt: new Date().toISOString(),
      createdBy: userRole === 'sales' ? 'sales' : 'engineer'
    });
    setRepairLogModal(null);
  };

  const handleUpdateRoom = async (nextStep) => {
    const docId = `${activePropertyId}_${selectedRoom}`;
    const timestamp = new Date().toLocaleString('th-TH');
    const info = roomStates[docId] || { status: 'ready' };

    const currentStepOwner = STEPS[info.status]?.owner;
    if (currentStepOwner && currentStepOwner !== userRole) {
      return alert(`ไม่อนุญาต! ขั้นตอนนี้สำหรับ ${currentStepOwner} เท่านั้น`);
    }

    if (nextStep === 'rented' && info.status === 'booked' && info.refrigeratorAssetId && info.refrigeratorStatus === 'requested') {
      return alert('ยังไม่ยืนยันว่าตู้เย็นเข้าห้องแล้ว — กรุณากด "ยืนยันตู้เย็นพร้อมในห้องแล้ว" ก่อนยืนยันทำสัญญา');
    }

    let updateData = {
      ...info,
      status: nextStep,
      lastUpdateBy: userRole === 'sales' ? 'ฝ่ายขาย (Sales)' : 'ฝ่ายช่าง (Engineer)',
      lastUpdateTime: timestamp,
      propertyId: activePropertyId
    };

    const form = document.getElementById('modalForm');
    let wantsRental = false;
    if (form) {
      const formData = new FormData(form);
      wantsRental = formData.get('needRefrigerator') === 'on';

      if (formData.get('tName')) updateData.tenantName = formData.get('tName');
      if (formData.get('tPhone')) updateData.tenantPhone = formData.get('tPhone');
      if (formData.get('tDate')) updateData.tDate = formData.get('tDate');
      if (formData.get('appointmentTime')) updateData.appointmentTime = formData.get('appointmentTime');
      if (formData.get('roomPrice')) updateData.roomPrice = formData.get('roomPrice');
      if (formData.get('insurance')) updateData.insurance = formData.get('insurance');
      if (formData.get('checkoutDate')) updateData.checkoutDate = formData.get('checkoutDate');
      if (formData.get('qcNote')) updateData.qcNote = formData.get('qcNote');
    }

    if (userRole === 'sales' && form && (info.status === 'appointment' || info.status === 'booked' || info.status === 'rented') && nextStep !== 'ready') {
      if (!wantsRental && info.refrigeratorAssetId) {
        await releaseFridgeAsset(db, info.refrigeratorAssetId);
        updateData.refrigeratorStatus = 'none';
        delete updateData.refrigeratorAssetId;
        delete updateData.refrigeratorReadyAt;
      } else if (wantsRental && !info.refrigeratorAssetId) {
        const candidates = getSortedAvailableFridgeIds();
        if (candidates.length === 0) {
          return alert('สินค้าหมด: ไม่มีตู้เย็นว่างในสต็อกกลาง — ไม่สามารถรับจองเช่าตู้เพิ่มได้');
        }
        const assigned = await reserveFirstAvailableFridge(db, candidates, docId, activePropertyId, selectedRoom);
        if (!assigned) {
          return alert('สต็อกตู้เย็นไม่พอหรือมีผู้จองพร้อมกัน กรุณาลองใหม่');
        }
        updateData.refrigeratorAssetId = assigned;
        updateData.refrigeratorStatus = info.status === 'rented' ? 'installed' : 'requested';
        if (info.status === 'rented') {
          updateData.refrigeratorReadyAt = timestamp;
        }
      } else if (wantsRental && info.refrigeratorAssetId) {
        updateData.refrigeratorAssetId = info.refrigeratorAssetId;
        updateData.refrigeratorStatus = info.status === 'rented'
          ? 'installed'
          : (info.refrigeratorStatus === 'installed' ? 'installed' : 'requested');
        if (info.status === 'rented' && !updateData.refrigeratorReadyAt) {
          updateData.refrigeratorReadyAt = timestamp;
        }
      } else if (!wantsRental && !info.refrigeratorAssetId) {
        updateData.refrigeratorStatus = 'none';
      }
    }

    if (Object.keys(repairs).length > 0) updateData.repairData = repairs;
    if (Object.keys(qcChecks).length > 0) updateData.qcData = qcChecks;

    if (nextStep === 'ready') {
      if (info.refrigeratorAssetId) await releaseFridgeAsset(db, info.refrigeratorAssetId);
      const keysToDelete = [
        'repairData', 'qcData', 'qcNote', 'tenantName', 'tenantPhone',
        'deposit', 'insurance', 'checkoutDate', 'appointmentDate', 'appointmentTime',
        'refrigeratorStatus', 'refrigeratorAssetId', 'refrigeratorReadyAt'
      ];
      keysToDelete.forEach((key) => delete updateData[key]);
    }

    await setDoc(doc(db, 'apartments', appId, 'rooms', docId), updateData);
    if (nextStep === 'rented' && updateData.refrigeratorAssetId) {
      await syncFridgeAssetWithRoomStatus(db, docId, updateData);
    }

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
           <button 
  onClick={() => setViewMode('partnerReport')} 
  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'partnerReport' ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-200'}`}
>
  <Monitor size={14} className="inline mr-1 mb-0.5"/> Partner Report
</button>
           {userRole === 'engineer' && (
             <>
               <button onClick={()=>setViewMode('repairLog')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='repairLog'?'bg-amber-600 text-white shadow-sm':'text-slate-400'}`}>บันทึกซ่อม</button>
               <button onClick={()=>setViewMode('airPlanner')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='airPlanner'?'bg-sky-500 text-white shadow-sm':'text-slate-400'}`}>แผนแอร์</button>
               <button onClick={()=>setViewMode('wmPlanner')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='wmPlanner'?'bg-indigo-600 text-white shadow-sm':'text-slate-400'}`}>เครื่องซักผ้า</button>
               <button onClick={()=>setViewMode('inventory')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='inventory'?'bg-cyan-600 text-white shadow-sm':'text-slate-400'}`}>Inventory</button>
               <button onClick={()=>setViewMode('facility')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${viewMode==='facility'?'bg-indigo-600 text-white shadow-sm':'text-slate-400'}`}>Facility</button>
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

                  <div className="bg-slate-800 p-8 rounded-[3rem] text-white shadow-lg border-b-4 border-cyan-600">
                    <h4 className="font-black text-xs uppercase mb-3 flex items-center gap-2"><Package size={18}/> ตู้เย็นเช่า — {activeProperty.name}</h4>
                    <p className="text-[10px] font-bold opacity-70 mb-4">ว่าง {activeFridgeStock.available} · ถูกเช่า {activeFridgeStock.rented} · ซ่อม {activeFridgeStock.maintenance}</p>
                    <button type="button" onClick={addFridgeAsset} className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-cyan-500 text-slate-900 font-black text-[10px] uppercase mb-4 active:scale-[0.98]">+ เพิ่มตู้ว่างเข้าสต็อก</button>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {Object.entries(assets).filter(([, a]) => (a.currentBuilding || a.propertyId) === activePropertyId && a.type === FRIDGE_ASSET_TYPE).map(([id, a]) => (
                        <div key={id} className="flex flex-wrap items-center justify-between gap-2 bg-white/10 p-3 rounded-xl text-[10px]">
                          <span className="font-black">{a.label || id.slice(0, 8)}</span>
                          <span className="opacity-80">{a.status === 'available' ? 'ว่าง' : a.status === 'rented' ? 'ถูกเช่า' : 'ซ่อม'}</span>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => setFridgeAssetStatus(id, 'available')} className="px-2 py-1 rounded-lg bg-emerald-600/80 font-black text-[8px] uppercase">ว่าง</button>
                            <button type="button" onClick={() => setFridgeAssetStatus(id, 'maintenance')} className="px-2 py-1 rounded-lg bg-amber-600/80 font-black text-[8px] uppercase">ซ่อม</button>
                          </div>
                        </div>
                      ))}
                      {Object.entries(assets).filter(([, a]) => (a.currentBuilding || a.propertyId) === activePropertyId && a.type === FRIDGE_ASSET_TYPE).length === 0 && (
                        <p className="text-[10px] opacity-50 italic">ยังไม่มีรายการ — กดเพิ่มตู้ว่าง</p>
                      )}
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

                  <div className="bg-cyan-700 p-6 rounded-[2.5rem] shadow-lg border-b-[6px] border-cyan-900 text-white">
                    <h4 className="font-black text-[10px] uppercase mb-3 tracking-widest flex items-center gap-2"><Package size={14}/> สต็อกตู้เย็นเช่า (อ้างอิงสต็อกกลาง)</h4>
                    <div className="flex flex-wrap gap-6 text-sm font-black">
                      <span>ว่าง: <span className={activeFridgeStock.available === 0 ? 'text-rose-300' : 'text-emerald-200'}>{activeFridgeStock.available}</span></span>
                      <span>ถูกเช่า: {activeFridgeStock.rented}</span>
                      <span>ซ่อม: {activeFridgeStock.maintenance}</span>
                    </div>
                    <p className="text-[9px] font-bold opacity-70 mt-2">เพิ่มตู้หรือตั้งสถานะซ่อม: โหมดช่าง → Summary หรือ Partner Report (สต็อกรวมทุกโครงการ)</p>
                  </div>

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
            ) : viewMode === 'partnerReport' ? (
          /* --- 📊 [NEW] MEGA SUMMARY FOR PARTNERS --- */
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 font-sans pb-10">
            <div className="text-center space-y-2 py-6">
              <h2 className="text-5xl font-black italic text-slate-900 uppercase tracking-tighter">Portfolio Executive Report</h2>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-100 inline-block px-4 py-1 rounded-full border">
                Update: {new Date().toLocaleDateString('th-TH')} | {new Date().toLocaleTimeString('th-TH')}
              </p>
            </div>

            {/* 💎 กล่องสรุปภาพรวมทั้งพอร์ต (Grand Total) */}
<div className="bg-slate-900 p-10 rounded-[4rem] shadow-2xl text-white mb-10 border-b-[12px] border-indigo-600">
  <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-4 text-center">Portfolio Grand Total (ทุกโครงการ)</p>
  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
     <div className="text-center">
        <p className="text-[9px] font-bold opacity-40 uppercase">ห้องว่างทั้งหมด</p>
        <p className="text-4xl font-black text-emerald-400">
          {Object.values(roomStates).filter(v => v.status === 'ready').length}
        </p>
     </div>
     <div className="text-center border-l border-white/10">
        <p className="text-[9px] font-bold opacity-40 uppercase">นัดดู/จองรวม</p>
        <p className="text-4xl font-black text-pink-400">
          {Object.values(roomStates).filter(v => v.status === 'appointment' || v.status === 'booked').length}
        </p>
     </div>
     <div className="text-center border-l border-white/10">
        <p className="text-[9px] font-bold opacity-40 uppercase">แจ้งย้ายรวม</p>
        <p className="text-4xl font-black text-rose-400">
          {Object.values(roomStates).filter(v => v.status === 'checkingOut').length}
        </p>
     </div>
     <div className="text-center border-l border-white/10">
        <p className="text-[9px] font-bold opacity-40 uppercase">อยู่จริงทั้งหมด</p>
        <p className="text-4xl font-black text-indigo-400">
          {Object.values(roomStates).filter(v => v.status === 'rented').length}
        </p>
     </div>
  </div>
</div>

            {userRole === 'sales' && (
              <div className="bg-gradient-to-br from-cyan-800 to-slate-900 p-10 rounded-[3rem] shadow-2xl text-white mb-10 border-b-[10px] border-cyan-500">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-60 mb-2 flex items-center gap-2"><Package size={18}/> สถานะสต็อกตู้เย็นเช่า (Inventory Check)</p>
                <p className="text-[11px] font-bold opacity-80 mb-6">เช็คทุกโครงการได้ทันที — ตู้ว่างคือที่พร้อมรับจองเช่า</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PROPERTIES.map((prop) => {
                    const s = fridgeStockByProperty[prop.id] || { available: 0, rented: 0, maintenance: 0 };
                    return (
                      <div key={prop.id} className="bg-white/10 rounded-[2rem] p-6 border border-white/10">
                        <p className="text-sm font-black italic">{prop.name}</p>
                        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[8px] font-bold opacity-60 uppercase">ว่าง</p>
                            <p className={`text-2xl font-black ${s.available === 0 ? 'text-rose-400' : 'text-emerald-300'}`}>{s.available}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold opacity-60 uppercase">ถูกเช่า</p>
                            <p className="text-2xl font-black text-cyan-200">{s.rented}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-bold opacity-60 uppercase">ซ่อม</p>
                            <p className="text-2xl font-black text-amber-300">{s.maintenance}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-8">
              {PROPERTIES.map(prop => {
                const rooms = Object.values(roomStates).filter(v => v.propertyId === prop.id);
                const ready = rooms.filter(v => v.status === 'ready').length;
                const appt = rooms.filter(v => v.status === 'appointment').length;
                const booked = rooms.filter(v => v.status === 'booked').length;
                const notice = rooms.filter(v => v.status === 'checkingOut' || v.status === 'keyReturn').length;
                const repair = rooms.filter(v => ['maintenance', 'cleaningPre', 'cleaningPost', 'finalQC'].includes(v.status)).length;

                return (
                  <div key={prop.id} className="bg-white p-10 rounded-[4rem] shadow-2xl border-2 border-slate-50 relative overflow-hidden group hover:border-indigo-100 transition-all">
                    <div className="flex justify-between items-end mb-8">
                       <div>
                         <h3 className="text-3xl font-black text-slate-800 italic leading-none">{prop.name}</h3>
                         <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-2 ml-1">Overall Status Summary</p>
                       </div>
                       <div className="text-right">
                         <p className="text-[10px] font-black text-slate-300 uppercase">Total Rooms</p>
                         <p className="text-2xl font-black text-slate-400">{prop.floors.reduce((acc, f) => acc + f.rooms.length, 0)}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {/* กล่องสีต่างๆ */}
                      <div className="bg-emerald-500 p-6 rounded-[2.5rem] text-white text-center shadow-lg border-b-[6px] border-emerald-700">
                        <Tag size={20} className="mx-auto mb-2 opacity-40"/>
                        <p className="text-[9px] font-black uppercase opacity-80">พร้อมขาย</p>
                        <p className="text-3xl font-black">{ready}</p>
                      </div>
                      <div className="bg-pink-500 p-6 rounded-[2.5rem] text-white text-center shadow-lg border-b-[6px] border-pink-700">
                        <Camera size={20} className="mx-auto mb-2 opacity-40"/>
                        <p className="text-[9px] font-black uppercase opacity-80">นัดดูห้อง</p>
                        <p className="text-3xl font-black">{appt}</p>
                      </div>
                      <div className="bg-purple-600 p-6 rounded-[2.5rem] text-white text-center shadow-lg border-b-[6px] border-purple-800">
                        <ShoppingBag size={20} className="mx-auto mb-2 opacity-40"/>
                        <p className="text-[9px] font-black uppercase opacity-80">รอย้ายเข้า</p>
                        <p className="text-3xl font-black">{booked}</p>
                      </div>
                      <div className="bg-rose-500 p-6 rounded-[2.5rem] text-white text-center shadow-lg border-b-[6px] border-rose-700">
                        <Calendar size={20} className="mx-auto mb-2 opacity-40"/>
                        <p className="text-[9px] font-black uppercase opacity-80">แจ้งย้าย</p>
                        <p className="text-3xl font-black">{notice}</p>
                      </div>
                      <div className="bg-amber-500 p-6 rounded-[2.5rem] text-white text-center shadow-lg border-b-[6px] border-amber-700">
                        <Wrench size={20} className="mx-auto mb-2 opacity-40"/>
                        <p className="text-[9px] font-black uppercase opacity-80">ปรับปรุง</p>
                        <p className="text-3xl font-black">{repair}</p>
                      </div>
                    </div>
                    {/* ลายน้ำจางๆ หลังตึก */}
                    <Building2 size={120} className="absolute -right-10 -top-10 opacity-[0.03] -rotate-12 pointer-events-none"/>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'inventory' ? (
          <Inventory />
        ) : viewMode === 'facility' ? (
          <Facility />
        ) : viewMode === 'repairLog' ? (
           <div className="space-y-8 animate-in fade-in font-sans max-w-6xl mx-auto pb-10">
              <div className="bg-gradient-to-br from-amber-600 to-orange-700 p-10 rounded-[3rem] text-white shadow-2xl">
                 <h2 className="text-2xl md:text-3xl font-black italic uppercase flex items-center gap-3"><ClipboardCheck size={32}/> บันทึกการซ่อม · {activeProperty.name}</h2>
                 <p className="text-[10px] font-bold opacity-80 mt-2">สรุปตามโครงการที่เลือก — ซิงค์แบบ Real-time จาก Firebase</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-slate-700">
                    <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-2">ต้นทุนรวม (ซ่อมจริง)</p>
                    <p className="text-3xl font-black">{maintenanceTotals.totalCost.toLocaleString()} ฿</p>
                 </div>
                 <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] shadow-xl border-b-8 border-indigo-800">
                    <p className="text-[10px] font-black uppercase opacity-50 tracking-widest mb-2">ยอดเรียกเก็บลูกค้า</p>
                    <p className="text-3xl font-black">{maintenanceTotals.totalCharge.toLocaleString()} ฿</p>
                 </div>
                 <div className={`p-8 rounded-[2.5rem] shadow-xl border-b-8 ${maintenanceTotals.profit >= 0 ? 'bg-emerald-500 text-white border-emerald-700' : 'bg-rose-500 text-white border-rose-700'}`}>
                    <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-2">กำไรส่วนต่างสะสม</p>
                    <p className="text-3xl font-black">{maintenanceTotals.profit.toLocaleString()} ฿</p>
                    <p className="text-[9px] font-bold mt-2 opacity-80">เรียกเก็บ − ต้นทุนจริง</p>
                 </div>
              </div>

              <div className="flex flex-wrap gap-3">
                 <button type="button" onClick={() => openRepairLogModal('air')} className="flex-1 min-w-[200px] bg-sky-500 hover:bg-sky-600 text-white py-6 rounded-[2rem] font-black text-sm uppercase shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                    <Wind size={22}/> บันทึกซ่อมแอร์
                 </button>
                 <button type="button" onClick={() => openRepairLogModal('wm')} className="flex-1 min-w-[200px] bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-[2rem] font-black text-sm uppercase shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                    <WashingMachine size={22}/> บันทึกซ่อมเครื่องซักผ้า
                 </button>
              </div>

              {['air', 'wm'].map((cat) => {
                 const rows = propertyMaintenanceLogsSorted.filter((l) => l.category === cat);
                 if (rows.length === 0) return null;
                 const title = cat === 'air' ? 'ประวัติซ่อมแอร์' : 'ประวัติซ่อมเครื่องซักผ้า';
                 const headClass = cat === 'air' ? 'bg-sky-500' : 'bg-indigo-600';
                 return (
                    <div key={cat} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
                       <div className={`${headClass} text-white px-8 py-4 font-black text-xs uppercase tracking-widest`}>{title}</div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-left text-[11px]">
                             <thead className="bg-slate-50 text-slate-500 font-black uppercase border-b">
                                <tr>
                                   <th className="p-4">วันที่</th>
                                   <th className="p-4">ห้อง/ตึก</th>
                                   <th className="p-4">รายละเอียด</th>
                                   <th className="p-4">เข้าห้อง</th>
                                   <th className="p-4 text-right">ทุนจริง</th>
                                   <th className="p-4 text-right">หักลูกค้า</th>
                                   <th className="p-4 text-right">ราคาเครื่องใหม่ (เทียบ)</th>
                                   <th className="p-4">ซ่อมสะสม vs ซื้อใหม่</th>
                                </tr>
                             </thead>
                             <tbody>
                                {rows.map((log) => {
                                   const cumulative = maintenanceCumulativeByLogId.get(log.id) ?? 0;
                                   const bench = Number(log.newEquipmentPrice) || 0;
                                   let worthMsg = '—';
                                   let worthClass = 'text-slate-400';
                                   if (bench > 0) {
                                      if (cumulative <= bench) {
                                         worthMsg = 'ซ่อมสะสมคุ้มกว่าซื้อใหม่ (ทุนสะสมยังไม่เกินราคาเครื่องใหม่)';
                                         worthClass = 'text-emerald-600 font-bold';
                                      } else {
                                         worthMsg = 'ทุนสะสมเกินราคาเครื่องใหม่ — พิจารณาซื้อใหม่';
                                         worthClass = 'text-rose-600 font-bold';
                                      }
                                   } else {
                                      worthMsg = 'ยังไม่ระบุราคาเครื่องใหม่สำหรับเทียบ';
                                   }
                                   return (
                                      <tr key={log.id} className="border-b border-slate-50 align-top hover:bg-slate-50/80">
                                         <td className="p-4 font-black whitespace-nowrap">{maintenanceDateYmd(log.date) || '—'}</td>
                                         <td className="p-4 font-black">{log.roomOrBuilding || '-'}</td>
                                         <td className="p-4 max-w-[200px] text-slate-600">{log.details || '—'}</td>
                                         <td className="p-4">{MAINTENANCE_ACCESS_LABEL[log.access] || log.access || '—'}</td>
                                         <td className="p-4 text-right font-black text-slate-800">{(Number(log.actualCost) || 0).toLocaleString()}</td>
                                         <td className="p-4 text-right font-black text-indigo-600">{(Number(log.customerCharge) || 0).toLocaleString()}</td>
                                         <td className="p-4 text-right font-black text-amber-600">{bench ? bench.toLocaleString() : '—'}</td>
                                         <td className="p-4">
                                            <p className={worthClass}>{worthMsg}</p>
                                            <p className="text-[9px] text-slate-400 mt-1">ทุนสะสมถึงรายการนี้: {cumulative.toLocaleString()} ฿</p>
                                         </td>
                                      </tr>
                                   );
                                })}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 );
              })}

              {propertyMaintenanceLogsSorted.length === 0 && (
                 <div className="text-center py-16 bg-slate-100 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-400 font-bold text-sm">
                    ยังไม่มีประวัติบันทึกซ่อมในโครงการนี้
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
                       {missions.repair.map((m) => (
                         <div key={m.key} className="bg-white/20 p-2 rounded-xl font-black italic text-sm font-sans">ห้อง {m.label}</div>
                       ))}
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
                <form id="modalForm" key={`modal-${activePropertyId}-${selectedRoom}-${(roomStates[`${activePropertyId}_${selectedRoom}`] || {}).status}-${(roomStates[`${activePropertyId}_${selectedRoom}`] || {}).refrigeratorAssetId || ''}`} className="space-y-6 font-sans">
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
      <label className="flex items-start gap-3 bg-white p-4 rounded-2xl border-2 border-pink-100 cursor-pointer">
        <input type="checkbox" name="needRefrigerator" defaultChecked={!!info.refrigeratorAssetId} className="mt-1 w-5 h-5 accent-pink-600 shrink-0" />
        <div>
          <span className="text-xs font-black text-slate-800">ลูกค้าต้องการเช่าตู้เย็น</span>
          <p className="text-[9px] font-bold text-slate-500 mt-1">เมื่อติ๊ก ระบบจะหักสต็อกกลางทันที — ตู้ว่างทั้งหมด: <span className="text-pink-600">{fridgeInventorySummary.available}</span> เครื่อง</p>
        </div>
      </label>

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
    {(info.refrigeratorStatus === 'requested' || info.refrigeratorAssetId) && info.refrigeratorStatus !== 'installed' && (
      <div className="bg-amber-100 border-2 border-amber-400 p-5 rounded-[2rem] flex gap-3 items-start">
        <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={22} />
        <div>
          <p className="text-xs font-black text-amber-900 uppercase tracking-wide">Move-in: ต้องนำตู้เย็นเข้าห้อง</p>
          <p className="text-[10px] font-bold text-amber-800 mt-1">ลูกค้าแจ้งเช่าตู้เย็นไว้ — นำตู้เข้าห้องแล้วกดยืนยันด้านล่างก่อนส่งมอบกุญแจ / ทำสัญญา</p>
        </div>
      </div>
    )}
    {info.refrigeratorStatus === 'installed' && (
      <div className="bg-emerald-50 border-2 border-emerald-200 p-4 rounded-2xl flex items-center gap-2 text-emerald-800">
        <CheckCircle2 size={20} />
        <span className="text-xs font-black">ตู้เย็นพร้อมในห้องแล้ว {info.refrigeratorReadyAt ? `(${info.refrigeratorReadyAt})` : ''}</span>
      </div>
    )}
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
      <label className="flex items-start gap-3 bg-white p-4 rounded-2xl border-2 border-purple-100 cursor-pointer">
        <input type="checkbox" name="needRefrigerator" defaultChecked={!!info.refrigeratorAssetId} className="mt-1 w-5 h-5 accent-purple-600 shrink-0" />
        <div>
          <span className="text-xs font-black text-slate-800">ลูกค้าต้องการเช่าตู้เย็น</span>
          <p className="text-[9px] font-bold text-slate-500 mt-1">สต็อกกลางว่าง: <span className="text-purple-600">{fridgeInventorySummary.available}</span> เครื่อง — ติ๊กแล้วบันทึกเพื่อหักสต็อก</p>
        </div>
      </label>
    </div>
    <div className="grid grid-cols-1 gap-3">
      <button type="button" onClick={() => handleUpdateRoom('booked')} className="w-full bg-white border-2 border-purple-300 text-purple-700 py-4 rounded-2xl font-black text-xs uppercase shadow-sm active:scale-[0.99]">บันทึกข้อมูลจอง (ยังไม่ทำสัญญา)</button>
      {info.refrigeratorStatus === 'requested' && (
        <button type="button" onClick={() => { handleConfirmFridgeInRoom(); }} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-lg border-b-4 border-emerald-700 active:scale-[0.99]">ยืนยันตู้เย็นพร้อมในห้องแล้ว</button>
      )}
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
      <label className="flex items-start gap-3 bg-white p-4 rounded-2xl border-2 border-slate-200 cursor-pointer">
        <input type="checkbox" name="needRefrigerator" defaultChecked={!!info.refrigeratorAssetId} className="mt-1 w-5 h-5 accent-slate-700 shrink-0" />
        <div>
          <span className="text-xs font-black text-slate-800">ลูกค้าต้องการเช่าตู้เย็น</span>
          <p className="text-[9px] font-bold text-slate-500 mt-1">สต็อกกลางว่าง: <span className="text-slate-700">{fridgeInventorySummary.available}</span> เครื่อง — บันทึกแล้วจะผูก/คืนตู้กับห้องนี้ทันที</p>
        </div>
      </label>
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

      {repairLogModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4 font-sans">
           <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start gap-4">
                 <div>
                    <h3 className="text-xl font-black text-slate-900">
                       {repairLogModal === 'air' ? 'บันทึกซ่อมแอร์' : 'บันทึกซ่อมเครื่องซักผ้า'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{activeProperty.name}</p>
                 </div>
                 <button type="button" onClick={() => setRepairLogModal(null)} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 shrink-0"><X size={22}/></button>
              </div>

              <div className="space-y-4">
                 <label className="block space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase">วันที่</span>
                    <input type="date" value={repairLogForm.date} onChange={(e) => setRepairLogForm({ ...repairLogForm, date: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm outline-none border-2 border-transparent focus:border-indigo-200" />
                 </label>
                 <label className="block space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase">เลขห้อง / ตึก</span>
                    <input value={repairLogForm.roomOrBuilding} onChange={(e) => setRepairLogForm({ ...repairLogForm, roomOrBuilding: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm outline-none border-2 border-transparent focus:border-indigo-200" placeholder="เช่น 501 หรือ ตึก A" />
                 </label>
                 <label className="block space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase">รายละเอียดงาน</span>
                    <textarea value={repairLogForm.details} onChange={(e) => setRepairLogForm({ ...repairLogForm, details: e.target.value })} rows={3} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs outline-none border-2 border-transparent focus:border-indigo-200" placeholder="อาการ / อะไหล่ / หมายเหตุ" />
                 </label>
                 <label className="block space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase">การเข้าห้อง</span>
                    <select value={repairLogForm.access} onChange={(e) => setRepairLogForm({ ...repairLogForm, access: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-black text-xs outline-none border-2 border-transparent focus:border-indigo-200">
                       <option value="allow">อนุญาตให้เข้า</option>
                       <option value="knock">เคาะประตูก่อน</option>
                       <option value="deny">ไม่อนุญาต</option>
                    </select>
                 </label>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="block space-y-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase">ทุนซ่อมจริง (฿)</span>
                       <input type="number" min="0" value={repairLogForm.actualCost} onChange={(e) => setRepairLogForm({ ...repairLogForm, actualCost: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm outline-none" />
                    </label>
                    <label className="block space-y-1">
                       <span className="text-[9px] font-black text-slate-400 uppercase">หักลูกค้า (฿)</span>
                       <input type="number" min="0" value={repairLogForm.customerCharge} onChange={(e) => setRepairLogForm({ ...repairLogForm, customerCharge: e.target.value })} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm outline-none" />
                    </label>
                    <label className="block space-y-1">
                       <span className="text-[9px] font-black text-amber-600 uppercase">ราคาเครื่องใหม่ (฿)</span>
                       <input type="number" min="0" value={repairLogForm.newEquipmentPrice} onChange={(e) => setRepairLogForm({ ...repairLogForm, newEquipmentPrice: e.target.value })} className="w-full p-3 bg-amber-50 rounded-xl font-black text-sm outline-none border-2 border-amber-100" placeholder="เทียบความคุ้มค่า" />
                    </label>
                 </div>
              </div>

              <div className="flex gap-3 pt-2">
                 <button type="button" onClick={() => setRepairLogModal(null)} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase bg-slate-100 text-slate-600">ยกเลิก</button>
                 <button type="button" onClick={submitMaintenanceLog} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase bg-slate-900 text-white shadow-lg">บันทึก</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}