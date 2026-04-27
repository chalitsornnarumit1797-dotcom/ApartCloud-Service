import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ALLOWED_STATUSES = ['available', 'rented', 'maintenance'];

const STATUS_LABELS = {
  available: 'Available',
  rented: 'Rented',
  maintenance: 'Maintenance',
};

const STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-700',
  rented: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-rose-100 text-rose-700',
  unknown: 'bg-slate-100 text-slate-700',
};

const normalizeStatus = (status) => (ALLOWED_STATUSES.includes(status) ? status : 'maintenance');

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'refrigerators'), (snapshot) => {
      const items = snapshot.docs.map((itemDoc) => {
        const data = itemDoc.data();
        return {
          id: itemDoc.id,
          assetId: data.assetId || '-',
          brand: data.brand || '-',
          size: data.size || '-',
          status: normalizeStatus(data.status),
          currentBuilding: data.currentBuilding || '-',
          currentRoom: data.currentRoom || '-',
        };
      });

      items.sort((a, b) => String(a.assetId).localeCompare(String(b.assetId)));
      setRows(items);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      {
        total: 0,
        available: 0,
        rented: 0,
        maintenance: 0,
      },
    );
  }, [rows]);

  const handleAddFridge = async () => {
    const assetId = window.prompt('1/3 ระบุรหัสตู้เย็น (assetId):');
    if (!assetId) return;

    const brand = window.prompt('2/3 ระบุยี่ห้อ (brand):') || '';
    const size = window.prompt('3/3 ระบุขนาด (size):') || '';

    try {
      await addDoc(collection(db, 'refrigerators'), {
        assetId: assetId.trim(),
        brand: brand.trim(),
        size: size.trim(),
        status: 'available',
        currentBuilding: '',
        currentRoom: '',
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      alert(`เพิ่มข้อมูลไม่สำเร็จ: ${error.message}`);
    }
  };

  const handleEditAssetDetails = async (item) => {
    const nextAssetId = window.prompt('แก้ไข assetId:', item.assetId || '');
    if (nextAssetId === null) return;

    const nextBrand = window.prompt('แก้ไข brand:', item.brand || '');
    if (nextBrand === null) return;

    const nextSize = window.prompt('แก้ไข size:', item.size || '');
    if (nextSize === null) return;

    try {
      await updateDoc(doc(db, 'refrigerators', item.id), {
        assetId: nextAssetId.trim(),
        brand: nextBrand.trim(),
        size: nextSize.trim(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      alert(`บันทึกไม่สำเร็จ: ${error.message}`);
    }
  };

  const handleUpdateStatus = async (id, nextStatus) => {
    if (!ALLOWED_STATUSES.includes(nextStatus)) return;
    try {
      await updateDoc(doc(db, 'refrigerators', id), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      alert(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6 p-6 font-sans bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">Centralized Inventory</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Refrigerators Collection</p>
        </div>
        <button
          onClick={handleAddFridge}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-indigo-600 transition-all"
        >
          + Add Refrigerator
        </button>
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
          <p className="text-[9px] font-black uppercase opacity-40">Rented</p>
          <p className="text-4xl font-black tracking-tighter">{summary.rented}</p>
        </div>
        <div className="bg-rose-500 p-6 rounded-[2.5rem] shadow-xl">
          <p className="text-[9px] font-black uppercase opacity-40">Maintenance</p>
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
                    ยังไม่มีข้อมูลตู้เย็นในคลังกลาง
                  </td>
                </tr>
              )}

              {rows.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-6 font-black text-slate-900">{item.assetId}</td>
                  <td className="p-6 text-xs font-bold text-slate-500">{item.brand}</td>
                  <td className="p-6 text-xs font-bold text-slate-500">{item.size}</td>
                  <td className="p-6">
                    <span
                      className={`px-4 py-1 rounded-full text-[9px] font-black uppercase shadow-sm ${STATUS_STYLES[item.status] || STATUS_STYLES.unknown}`}
                    >
                      {STATUS_LABELS[item.status] || item.status}
                    </span>
                  </td>
                  <td className="p-6 text-[10px] font-black text-slate-500">{item.currentBuilding || '-'}</td>
                  <td className="p-6 text-[10px] font-black text-slate-500">{item.currentRoom || '-'}</td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEditAssetDetails(item)}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'available')}
                        className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase"
                      >
                        Available
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'rented')}
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase"
                      >
                        Rented
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(item.id, 'maintenance')}
                        className="px-3 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black uppercase"
                      >
                        Maintenance
                      </button>
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