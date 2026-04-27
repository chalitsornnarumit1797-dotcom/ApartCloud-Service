import React, { useEffect, useMemo, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, onSnapshot, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { Settings, CheckCircle2, Wrench, ArrowRightLeft, Edit3, Plus, Save } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyASTtm9rgugCwKhcRC27j5ugJHFWbhM_8k",
  authDomain: "chalitsorn-s-workspace.firebaseapp.com",
  projectId: "chalitsorn-s-workspace",
  storageBucket: "chalitsorn-s-workspace.firebasestorage.app",
  messagingSenderId: "823661781920",
  appId: "1:823661781920:web:c92e026e81478b4ff63ac5",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const APP_ID = 'apartcloud-service';

const BUILDING_LABELS = {
  mangmee: 'บ้านมั่งมีทวีสุข',
  mytree: 'บ้านมายทรี 48',
  khunluang: 'บ้านคุณหลวง',
  meesap: 'อพาร์ทเม้นท์มีทรัพย์',
  meethong: 'อพาร์ทเม้นท์มีทอง',
};

const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-700',
  rented: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-rose-100 text-rose-700',
  unknown: 'bg-slate-100 text-slate-700',
};

export default function Inventory() {
  const [selectedBuilding, setSelectedBuilding] = useState('mangmee');
  const [rows, setRows] = useState([]);
  const [roomByAsset, setRoomByAsset] = useState({});
  const [loading, setLoading] = useState(true);

  // 1. ดึงข้อมูลตู้เย็น
  useEffect(() => {
    setLoading(true);
    const refrigeratorsRef = collection(db, 'refrigerators');
    const refrigeratorsByBuildingQuery = query(refrigeratorsRef, where('propertyId', '==', selectedBuilding));

    const unsubscribe = onSnapshot(refrigeratorsByBuildingQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      items.sort((a, b) => String(a.assetId || '').localeCompare(String(b.assetId || '')));
      setRows(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedBuilding]);

  // 2. ดึงข้อมูลการเช่าห้องพักมาเชื่อมโยง
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'apartments', APP_ID, 'rooms'), (snapshot) => {
      const mapped = {};
      snapshot.docs.forEach((roomDoc) => {
        const roomData = roomDoc.data();
        if (!roomData.refrigeratorAssetId) return;
        const roomNo = roomDoc.id.includes('_') ? roomDoc.id.split('_')[1] : roomDoc.id;
        mapped[roomData.refrigeratorAssetId] = roomNo;
      });
      setRoomByAsset(mapped);
    });
    return () => unsubscribe();
  }, []);

  const handleAddFridge = async () => {
    const assetId = window.prompt("1/3 ระบุรหัสตู้เย็น:");
    if (!assetId) return;
    const brand = window.prompt("2/3 ระบุยี่ห้อ/รุ่น:");
    const size = window.prompt("3/3 ระบุขนาด:");
    
    try {
      await addDoc(collection(db, 'refrigerators'), {
        assetId,
        brand: brand || '-',
        size: size || '-',
        status: 'available',
        propertyId: selectedBuilding,
        createdAt: new Date().toISOString()
      });
      alert('เพิ่มตู้เย็นสำเร็จ!');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      await updateDoc(doc(db, 'refrigerators', id), { 
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleEditDetails = async (item) => {
    const newAssetId = window.prompt("แก้ไข Asset ID:", item.assetId || '');
    if (newAssetId === null) return;
    const newBrand = window.prompt("แก้ไขยี่ห้อ/รุ่น:", item.brand || '');
    if (newBrand === null) return;
    const newSize = window.prompt("แก้ไขขนาด:", item.size || '');
    if (newSize === null) return;

    try {
      await updateDoc(doc(db, 'refrigerators', item.id), { 
        assetId: newAssetId,
        brand: newBrand,
        size: newSize,
        updatedAt: new Date().toISOString()
      });
      alert('บันทึกสำเร็จ!');
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleUpdateLocation = async (id) => {
    const nextBuilding = window.prompt("ระบุรหัสตึกใหม่:");
    if (nextBuilding && BUILDING_LABELS[nextBuilding]) {
      await updateDoc(doc(db, 'refrigerators', id), { 
        propertyId: nextBuilding,
        currentBuilding: nextBuilding 
      });
    }
  };

  const summary = useMemo(() => {
    return rows.reduce((acc, item) => {
      acc.total += 1;
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { total: 0, rented: 0, available: 0, maintenance: 0 });
  }, [rows]);

  return (
    <div className="space-y-6 p-6 font-sans bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Inventory</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Asset Management System</p>
        </div>
        <button onClick={handleAddFridge} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-600 transition-all">
          + Add Asset
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {Object.entries(BUILDING_LABELS).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSelectedBuilding(id)}
            className={`px-5 py-2 rounded-2xl font-black text-[10px] uppercase whitespace-nowrap transition-all ${
              selectedBuilding === id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
        <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl">
          <p className="text-[9px] font-black uppercase opacity-40">Total Units</p>
          <p className="text-4xl font-black tracking-tighter">{summary.total}</p>
        </div>
        <div className="bg-emerald-500 p-6 rounded-[2.5rem] shadow-xl">
          <p className="text-[9px] font-black uppercase opacity-40">Available</p>
          <p className="text-4xl font-black tracking-tighter">{summary.available}</p>
        </div>
        <div className="bg-amber-500 p-6 rounded-[2.5rem] shadow-xl">
          <p className="text-[9px] font-black uppercase opacity-40">In Use (Rented)</p>
          <p className="text-4xl font-black tracking-tighter">{summary.rented}</p>
        </div>
        <div className="bg-rose-500 p-6 rounded-[2.5rem] shadow-xl">
          <p className="text-[9px] font-black uppercase opacity-40">In Repair</p>
          <p className="text-4xl font-black tracking-tighter">{summary.maintenance}</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
              <tr>
                <th className="p-6">Asset ID</th>
                <th className="p-6">Brand</th>
                <th className="p-6">Size</th>
                <th className="p-6">Status</th>
                <th className="p-6">Building</th>
                <th className="p-6">Room</th>
                <th className="p-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs font-bold text-slate-400">
                    Loading inventory...
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-xs font-bold text-slate-400">
                    ไม่พบข้อมูลตู้เย็นสำหรับตึกนี้
                  </td>
                </tr>
              )}
              {rows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-black text-slate-900">{item.assetId}</td>
                  <td className="p-6 text-xs font-bold text-slate-500">{item.brand}</td>
                  <td className="p-6 text-xs font-bold text-slate-500">{item.size}</td>
                  <td className="p-6">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${STATUS_STYLES[item.status] || STATUS_STYLES.unknown}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-6">
                    <button onClick={() => handleUpdateLocation(item.id)} className="text-[10px] font-bold text-indigo-600 hover:underline">
                      {BUILDING_LABELS[item.propertyId] || 'เลือกตึก'}
                    </button>
                  </td>
                  {/* --- จุดที่นายต้องการ: เช็คสถานะก่อนโชว์เลขห้อง --- */}
                  <td className="p-6 text-[10px] font-black text-slate-400">
                    {item.status === 'rented' 
                      ? (roomByAsset[item.id] || roomByAsset[item.assetId] || item.currentRoom || '-') 
                      : '-'}
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleEditDetails(item)} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase"><Edit3 size={12}/></button>
                      <button onClick={() => handleUpdateStatus(item.id, 'available')} className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase">Free</button>
                      <button onClick={() => handleUpdateStatus(item.id, 'maintenance')} className="px-3 py-1 bg-rose-100 text-rose-600 rounded-lg text-[10px] font-black uppercase">Fix</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}