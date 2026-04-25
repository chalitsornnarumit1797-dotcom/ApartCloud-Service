import React, { useEffect, useMemo, useState } from 'react';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { collection, getFirestore, onSnapshot } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyASTtm9rgugCwKhcRC27j5ugJHFWbhM_8k",
  authDomain: "chalitsorn-s-workspace.firebaseapp.com",
  projectId: "chalitsorn-s-workspace",
  storageBucket: "chalitsorn-s-workspace.firebasestorage.app",
  messagingSenderId: "823661781920",
  appId: "1:823661781920:web:c92e026e81478b4ff63ac5",
};

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

function resolveModel(asset) {
  if (asset.model) return asset.model;
  if (asset.brand && asset.size) return `${asset.brand} ${asset.size}`;
  return asset.brand || asset.size || '-';
}

function resolveLocation(asset) {
  const buildingId = asset.currentBuilding || asset.propertyId;
  const buildingLabel = BUILDING_LABELS[buildingId] || buildingId || '-';
  const room = asset.currentRoom || asset.roomNo || null;
  if (!buildingId && !room) return '-';
  return room ? `${buildingLabel}-${room}` : buildingLabel;
}

export default function Inventory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const db = getFirestore(app);

    const unsubscribe = onSnapshot(
      collection(db, 'refrigerators'),
      (snapshot) => {
        const items = snapshot.docs.map((snapshotDoc) => {
          const data = snapshotDoc.data();
          return {
            id: snapshotDoc.id,
            assetId: data.assetId || snapshotDoc.id,
            model: resolveModel(data),
            status: data.status || 'unknown',
            location: resolveLocation(data),
          };
        });

        items.sort((a, b) => String(a.assetId).localeCompare(String(b.assetId)));
        setRows(items);
        setLoading(false);
      },
      () => {
        setError('ไม่สามารถโหลดข้อมูลตู้เย็นจาก Firestore ได้');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const summary = useMemo(() => {
    return rows.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.status === 'rented') acc.rented += 1;
        if (item.status === 'available') acc.available += 1;
        return acc;
      },
      { total: 0, rented: 0, available: 0 }
    );
  }, [rows]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Inventory - ตู้เย็นเช่า 5 ตึก</h1>
        <p className="text-sm text-slate-500">เชื่อมต่อข้อมูลแบบ Real-time จาก Firestore collection `refrigerators`</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">จำนวนทั้งหมด</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">กำลังเช่า</p>
          <p className="mt-2 text-3xl font-black text-amber-600">{summary.rented}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">คงเหลือ</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{summary.available}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Asset ID</th>
                <th className="px-4 py-3 text-left font-semibold">รุ่น</th>
                <th className="px-4 py-3 text-left font-semibold">สถานะ</th>
                <th className="px-4 py-3 text-left font-semibold">ตำแหน่ง (ตึก-ห้อง)</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              )}

              {!loading && error && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    ยังไม่มีข้อมูลตู้เย็นในระบบ
                  </td>
                </tr>
              )}

              {!loading && !error && rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.assetId}</td>
                  <td className="px-4 py-3 text-slate-700">{row.model}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[row.status] || STATUS_STYLES.unknown}`}>
                      {STATUS_LABELS[row.status] || row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
