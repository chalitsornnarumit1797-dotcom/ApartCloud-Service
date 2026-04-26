import React, { useEffect, useMemo, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, onSnapshot, updateDoc, addDoc } from 'firebase/firestore';
import { Settings, CheckCircle2, Wrench, ArrowRightLeft, Edit3, Plus } from 'lucide-react';

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

const BUILDING_LABELS = {
  mangmee: 'บ้านมั่งมีทวีสุข',
  mytree: 'บ้านมายทรี 48',
  khunluang: 'บ้านคุณหลวง',
  meesap: 'อพาร์ทเม้นท์มีทรัพย์',
  meethong: 'อพาร์ทเม้นท์มีทอง',
};

const STATUS_LABELS = {
  available: 'คงเหลือ',
  rented: 'กำลังเช่า',
  maintenance: 'ซ่อมบำรุง',
};

const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-700',
  rented: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-rose-100 text-rose-700',
  unknown: 'bg-slate-100 text-slate-700',
};

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'refrigerators'),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        items.sort((a, b) => String(a.assetId || '').localeCompare(String(b.assetId || '')));
        setRows(items);
        setLoading(false);
      },
      () => {
        setError('ไม่สามารถโหลดข้อมูลได้');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // --- 🛠️ 1. ฟังก์ชันเพิ่มตู้เย็นใหม่ ---
  const handleAddFridge = async () => {
    const assetId = window.prompt("ระบุรหัสตู้เย็น (เช่น RF-001):");
    if (!assetId) return;
    const brand = window.prompt("ระบุยี่ห้อ/รุ่น:");
    
    try {
      await addDoc(collection(db, 'refrigerators'), {
        assetId: assetId,
        brand: brand || 'ตู้เย็นใหม่',
        status: 'available',
        propertyId: 'meethong', 
        createdAt: new Date().toISOString()
      });
      alert('เพิ่มตู้เย็นสำเร็จ!');
    } catch (err) {
      alert('เพิ่มไม่สำเร็จ: ' + err.message);
    }
  };

  // --- 🛠️ 2. ฟังก์ชันแก้ไขสถานะ (ปุ่มด่วน) ---
  const handleUpdateStatus = async (id, nextStatus) => {
    try {
      const assetRef = doc(db, 'refrigerators', id);
      await updateDoc(assetRef, { 
        status: nextStatus,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      alert('แก้ไขสถานะไม่สำเร็จ: ' + err.message);
    }
  };

  // --- 🛠️ 3. ฟังก์ชันแก้ไขรายละเอียด (Edit Details) ---
  const handleEditDetails = async (item) => {
    const newBrand = window.prompt("แก้ไขยี่ห้อ/รุ่น:", item.brand || '');
    if (newBrand === null) return;

    try {
      const assetRef = doc(db, 'refrigerators', item.id);
      await updateDoc(assetRef, { 
        brand: newBrand,
        updatedAt: new Date().toISOString()
      });
      alert('แก้ไขข้อมูลสำเร็จ!');
    } catch (err) {
      alert('แก้ไขไม่สำเร็จ: ' + err.message);
    }
  };

  // --- 🛠️ 4. ฟังก์ชันย้ายตึก ---
  const handleUpdateLocation = async (id) => {
    const nextBuilding = window.prompt("ระบุรหัสตึกใหม่ (mangmee, mytree, khunluang, meesap, meethong):");
    if (nextBuilding && BUILDING_LABELS[nextBuilding]) {
      try {
        const assetRef = doc(db, 'refrigerators', id);
        await updateDoc(assetRef, { 
          propertyId: nextBuilding,
          currentBuilding: nextBuilding 
        });
      } catch (err) {
        alert('ย้ายตึกไม่สำเร็จ');
      }
    } else if (nextBuilding) {
      alert('รหัสตึกไม่ถูกต้อง');
    }
  };

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'rented') acc.rented += 1;
        if (item.status === 'available') acc.available += 1;
        if (item.status === 'maintenance') acc.maintenance += 1;
        return acc;
      },
      { total: 0, rented: 0, available: 0, maintenance: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-6 p-6 font-sans bg-slate-50 min-h-screen">
      {/* ส่วนหัวหน้าจอ */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase">Asset Inventory</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">สต็อกรวมทุกโครงการ (เป้าหมาย 50 เครื่อง)</p>
        </div>
        <button 
          onClick={handleAddFridge}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2"
        >
          <Plus size={16}/> + Add Refrigerator
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[9px] font-black uppercase opacity-40">Total Units</p>
          <p className="text-4xl font-black">{summary.total}</p>
        </div>
        <div className="bg-emerald-500 p-6 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[9px] font-black uppercase opacity-40">Total Available</p>
          <p className="text-4xl font-black">{summary.available}</p>
        </div>
        <div className="bg-indigo-600 p-6 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[9px] font-black uppercase opacity-40">Total Rented</p>
          <p className="text-4xl font-black">{summary.rented}</p>
        </div>
        <div className="bg-orange-500 p-6 rounded-[2.5rem] shadow-xl text-white">
          <p className="text-[9px] font-black uppercase opacity-40">Total In Repair</p>
          <p className="text-4xl font-black">{summary.maintenance}</p>
        </div>
      </div>

      {/* ช่องโอนตู้เย็น (คงเดิมของนาย) */}
      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-4">
          <div className="flex gap-4">
            <input className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-sm outline-none" placeholder="Document ID หรือ Asset ID ของตู้ที่จะโอน" />
            <button className="bg-cyan-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2"><ArrowRightLeft size={16}/> Transfer Asset</button>
          </div>
          <p className="text-[10px] font-bold text-slate-400 italic">โอนตู้ได้ทันทีระหว่างอาคาร/ห้อง โดยไม่ต้องแก้หลายจุด</p>
      </div>

      {/* 📋 ตารางรายการตู้เย็น (จุดที่แก้ปุ่ม Edit) */}
      <div className="bg-white rounded-[3rem] border-2 border-slate-50 shadow-sm overflow-hidden mt-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
              <tr>
                <th className="p-6">Asset ID</th>
                <th className="p-6">Brand</th>
                <th className="p-6">Size</th>
                <th className="p-6">Status</th>
                <th className="p-6">Current Building</th>
                <th className="p-6">Current Room</th>
                <th className="p-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-black text-slate-900">{item.assetId}</td>
                  <td className="p-6 text-xs font-bold text-slate-500">{item.brand || '-'}</td>
                  <td className="p-6 text-xs font-bold text-slate-500">{item.size || '-'}</td>
                  <td className="p-6">
                    <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${STATUS_STYLES[item.status] || STATUS_STYLES.unknown}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="p-6 text-[10px] font-bold text-slate-400">{BUILDING_LABELS[item.propertyId] || '-'}</td>
                  <td className="p-6 text-[10px] font-bold text-slate-400">{item.currentRoom || '-'}</td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEditDetails(item)}
                        className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-black uppercase bg-blue-600 text-white border border-blue-700 shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleUpdateStatus(item.id, 'available')} className="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-black uppercase">Available</button>
                      <button onClick={() => handleUpdateStatus(item.id, 'maintenance')} className="px-3 py-1 bg-amber-100 text-amber-600 rounded-lg text-[10px] font-black uppercase">Repair</button>
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