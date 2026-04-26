import React, { useState } from 'react';
import { Droplets, Warehouse, PhoneCall, AlertTriangle, Edit3, Save, Building2, CheckCircle2 } from 'lucide-react';

const Facility = () => {
  const [selectedBuilding, setSelectedBuilding] = useState('mangmee');
  const [isEditing, setIsEditing] = useState(false);
  
  const [buildingData, setBuildingData] = useState({
    mangmee: {
      name: 'บ้านมั่งมีทวีสุข',
      pumps: [
        { name: 'Transfer Pump (ล่าง)', model: 'Mitsubishi 305W', status: 'ปกติ' },
        { name: 'Booster Pump (บน)', model: 'Mitsubishi 1100W', status: 'ปกติ' }
      ],
      tanks: '7 ถัง (รวม 11,250 ลิตร)',
      emergency: 'ช่างเอก: 081-xxx-xxxx',
      mapImage: 'https://via.placeholder.com/400x300?text=Water+Map+Mangmee' 
    },
    mytree: {
      name: 'บ้านมายทรี 48',
      pumps: [{ name: 'รอเพิ่มข้อมูล', model: '-', status: '-' }],
      tanks: 'รอข้อมูล',
      emergency: 'รอข้อมูล',
      mapImage: null
    },
    khunluang: {
      name: 'บ้านคุณหลวง',
      pumps: [{ name: 'รอเพิ่มข้อมูล', model: '-', status: '-' }],
      tanks: 'รอข้อมูล',
      emergency: 'รอข้อมูล',
      mapImage: null
    },
    meesap: {
      name: 'อพาร์ทเม้นท์มีทรัพย์',
      pumps: [{ name: 'รอเพิ่มข้อมูล', model: '-', status: '-' }],
      tanks: 'รอข้อมูล',
      emergency: 'รอข้อมูล',
      mapImage: null
    },
    meethong: {
      name: 'อพาร์ทเม้นท์มีทอง',
      pumps: [{ name: 'รอเพิ่มข้อมูล', model: '-', status: '-' }],
      tanks: 'รอข้อมูล',
      emergency: 'รอข้อมูล',
      mapImage: null
    }
  });

  const current = buildingData[selectedBuilding];

  // ฟังก์ชันช่วยอัปเดตข้อมูลแบบ Nested Object
  const updateData = (field, value, index = null) => {
    const newData = { ...buildingData };
    if (index !== null) {
      // อัปเดตในส่วนของปั๊มน้ำ
      newData[selectedBuilding].pumps[index][field] = value;
    } else {
      // อัปเดตข้อมูลทั่วไป (tanks, emergency)
      newData[selectedBuilding][field] = value;
    }
    setBuildingData(newData);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* --- Building Selector --- */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {Object.keys(buildingData).map((id) => (
          <button
            key={id}
            onClick={() => { setSelectedBuilding(id); setIsEditing(false); }}
            className={`px-6 py-3 rounded-2xl font-black text-xs uppercase transition-all whitespace-nowrap shadow-sm ${
              selectedBuilding === id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border'
            }`}
          >
            {buildingData[id].name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- Column 1: Equipment List --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Droplets className="text-indigo-600" /> ระบบปั๊มน้ำ
              </h2>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-3 rounded-2xl transition-all shadow-md ${
                  isEditing ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {isEditing ? <Save size={18} /> : <Edit3 size={18} />}
              </button>
            </div>
            
            <div className="space-y-4">
              {current.pumps.map((pump, idx) => (
                <div key={idx} className="flex flex-wrap md:flex-nowrap justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
                  <div className="flex-1 w-full md:w-auto">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input 
                          className="w-full p-2 border-2 border-indigo-100 rounded-xl text-sm font-black outline-none focus:border-indigo-500"
                          value={pump.name}
                          placeholder="ชื่อปั๊ม"
                          onChange={(e) => updateData('name', e.target.value, idx)}
                        />
                        <input 
                          className="w-full p-2 border-2 border-slate-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:border-indigo-500"
                          value={pump.model}
                          placeholder="รุ่นปั๊ม"
                          onChange={(e) => updateData('model', e.target.value, idx)}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="font-black text-slate-800 text-lg">{pump.name}</p>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{pump.model}</p>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                     {isEditing ? (
                       <select 
                        className="p-2 border-2 border-indigo-100 rounded-xl text-[10px] font-black uppercase outline-none"
                        value={pump.status}
                        onChange={(e) => updateData('status', e.target.value, idx)}
                       >
                         <option value="ปกติ">ปกติ</option>
                         <option value="รอซ่อม">รอซ่อม</option>
                         <option value="เสีย">เสีย</option>
                       </select>
                     ) : (
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-sm ${
                        pump.status === 'ปกติ' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                      }`}>
                        {pump.status}
                      </span>
                     )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <Warehouse className="text-indigo-600" /> ถังพักน้ำสำรอง
            </h2>
            <div className={`p-8 rounded-3xl border transition-all ${isEditing ? 'bg-indigo-50 border-indigo-300' : 'bg-indigo-50 border-indigo-100'}`}>
              {isEditing ? (
                <input 
                  className="w-full p-4 bg-white border-2 border-indigo-200 rounded-2xl font-black text-xl text-indigo-900 outline-none"
                  value={current.tanks}
                  onChange={(e) => updateData('tanks', e.target.value)}
                />
              ) : (
                <p className="text-2xl font-black text-indigo-900">{current.tanks}</p>
              )}
              <p className="text-[10px] font-black text-indigo-400 uppercase mt-2 tracking-widest">ความจุรวมรายตึก</p>
            </div>
          </div>
        </div>

        {/* --- Column 2: Visual Map & Emergency --- */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[3rem] shadow-xl text-white">
            <h2 className="text-xl font-black mb-4 flex items-center gap-3">
              <AlertTriangle className="text-amber-400" /> แผนผังวิศวกรรม
            </h2>
            <div className="aspect-video bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-slate-700 overflow-hidden group relative">
              {current.mapImage ? (
                <img src={current.mapImage} alt="Map" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-4">
                  <Building2 size={40} className="mx-auto mb-2 opacity-20" />
                  <p className="text-[10px] font-bold opacity-40 italic">ยังไม่มีรูปผังตึกนี้<br/>(ระบบอัปโหลดกำลังพัฒนา)</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-emerald-500 p-8 rounded-[3rem] shadow-xl text-white relative overflow-hidden">
            <h2 className="text-xl font-black mb-4 flex items-center gap-3 relative z-10">
              <PhoneCall /> สายด่วนซ่อม
            </h2>
            <div className="relative z-10">
              {isEditing ? (
                <input 
                  className="w-full p-4 bg-white/20 border-2 border-white/30 rounded-2xl font-black text-lg text-white placeholder:text-white/50 outline-none"
                  value={current.emergency}
                  onChange={(e) => updateData('emergency', e.target.value)}
                />
              ) : (
                <p className="text-2xl font-black">{current.emergency}</p>
              )}
              <p className="text-[10px] font-bold opacity-70 uppercase mt-2 tracking-wider">โทรหาช่างทันทีเมื่อเกิดเหตุ</p>
            </div>
            <Droplets className="absolute -right-10 -bottom-10 size-48 opacity-10 rotate-12" />
          </div>
          
          {isEditing && (
            <div className="bg-white p-6 rounded-[2rem] border-2 border-emerald-500 flex items-center gap-3 text-emerald-600 animate-bounce">
              <CheckCircle2 size={24} />
              <p className="text-xs font-black uppercase">กำลังอยู่ในโหมดแก้ไข...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Facility;