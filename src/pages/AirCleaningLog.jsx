import React, { useState, useMemo } from 'react';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Wind, Plus, Search, Edit3, Trash2, Save, X, Calendar, Clock, Gauge, FileText, Filter } from 'lucide-react';
import { db } from '../firebase';

const PROPERTIES = [
  { id: 'mangmee', name: 'บ้านมั่งมีทวีสุข', floors: [7,6,5,4,3,2].map(l => ({ level: l, rooms: Array.from({ length: 18 }, (_, i) => `${l}${String(i + 1).padStart(2, '0')}`) })) },
  { id: 'mytree', name: 'บ้านมายทรี 48', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: l===1 ? Array.from({length:11},(_,i)=>`1${String(i+1).padStart(2,'0')}`) : ['01','02','03','05','06','07','08','09','10','11','12','13','14','15'].map(r => `${l}${r}`) })) },
  { id: 'khunluang', name: 'บ้านคุณหลวง', floors: [4,3,2,1].map(l => ({ level: l, rooms: Array.from({ length: l===4?6:l===1?18:12 }, (_, i) => `${l}-${i + 1}`) })) },
  { id: 'meesap', name: 'อพาร์ทเม้นท์มีทรัพย์', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: Array.from({ length: 6 }, (_, j) => `${l}.${j + 1}`) })) },
  { id: 'meethong', name: 'อพาร์ทเม้นท์มีทอง', floors: [5,4,3,2,1].map(l => ({ level: l, rooms: l === 1 ? Array.from({ length: 11 }, (_, j) => `${102 + j}`) : Array.from({ length: 13 }, (_, j) => `${l}${String(j + 1).padStart(2, '0')}`) })) }
];

const TIME_OPTIONS = ['เช้า', 'บ่าย', 'ว่าง'];
const STATUS_OPTIONS = ['OK', 'สกปรก', 'สกปรกมาก', 'ต้องตรวจสอบ', 'พร้อมใช้งาน'];

const AirCleaningLog = ({ activePropertyId, airCleaningHistory }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchRoom, setSearchRoom] = useState('');
  const [formData, setFormData] = useState({
    no: '',
    room: '',
    date: new Date().toISOString().split('T')[0],
    time: 'เช้า',
    refrigerant: '',
    status: 'OK',
    notes: ''
  });

  const activeProperty = PROPERTIES.find(p => p.id === activePropertyId);
  const allRooms = useMemo(() => {
    if (!activeProperty) return [];
    return activeProperty.floors.flatMap(floor => floor.rooms);
  }, [activeProperty]);

  const filteredRecords = useMemo(() => {
    return airCleaningHistory
      .filter(record => record.propertyId === activePropertyId)
      .filter(record => !searchRoom || record.room.toLowerCase().includes(searchRoom.toLowerCase()))
      .sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        return dateB.localeCompare(dateA);
      });
  }, [airCleaningHistory, activePropertyId, searchRoom]);

  const getNextNumber = () => {
    const propertyRecords = airCleaningHistory.filter(r => r.propertyId === activePropertyId);
    if (propertyRecords.length === 0) return 1;
    const maxNo = Math.max(...propertyRecords.map(r => parseInt(r.no) || 0));
    return maxNo + 1;
  };

  const resetForm = () => {
    setFormData({
      no: getNextNumber().toString(),
      room: '',
      date: new Date().toISOString().split('T')[0],
      time: 'เช้า',
      refrigerant: '',
      status: 'OK',
      notes: ''
    });
    setEditingRecord(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const recordData = {
        ...formData,
        no: formData.no || getNextNumber().toString(),
        propertyId: activePropertyId,
        propertyName: activeProperty.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (editingRecord) {
        await updateDoc(doc(db, 'apartments', 'apartcloud-service', 'air_cleaning_history', editingRecord.id), recordData);
      } else {
        await addDoc(collection(db, 'apartments', 'apartcloud-service', 'air_cleaning_history'), recordData);
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error saving record:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      no: record.no || '',
      room: record.room || '',
      date: record.date || '',
      time: record.time || 'เช้า',
      refrigerant: record.refrigerant || '',
      status: record.status || 'OK',
      notes: record.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (recordId) => {
    if (!confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) return;
    try {
      await deleteDoc(doc(db, 'apartments', 'apartcloud-service', 'air_cleaning_history', recordId));
    } catch (error) {
      console.error('Error deleting record:', error);
      alert('เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-cyan-700 p-10 rounded-[3rem] text-white shadow-2xl mb-8">
        <h2 className="text-2xl md:text-3xl font-black italic uppercase flex items-center gap-3">
          <Wind size={32} /> Air Cleaning Log · {activeProperty?.name}
        </h2>
        <p className="text-[10px] font-bold opacity-80 mt-2">บันทึกประวัติการทำความสะอาดระบบแอร์ — ซิงค์แบบ Real-time จาก Firebase</p>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="ค้นหาห้อง (เช่น 601, 2-5)..."
            value={searchRoom}
            onChange={(e) => setSearchRoom(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black outline-none focus:border-teal-500 transition-all"
          />
        </div>
        <button
          onClick={openAddForm}
          className="px-6 py-3 bg-teal-600 text-white rounded-2xl font-black text-sm uppercase hover:bg-teal-700 transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={20} /> เพิ่มรายการใหม่
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Wind className="text-teal-600" />
                {editingRecord ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* No. */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2 flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">ลำดับ</span>
                  </label>
                  <input
                    type="text"
                    value={formData.no}
                    onChange={(e) => setFormData({...formData, no: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black outline-none focus:border-teal-500"
                    placeholder="เช่น 1, 2, 3..."
                  />
                </div>

                {/* Room */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2 flex items-center gap-2">
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">ห้อง</span>
                  </label>
                  <select
                    value={formData.room}
                    onChange={(e) => setFormData({...formData, room: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black outline-none focus:border-teal-500"
                    required
                  >
                    <option value="">เลือกห้อง</option>
                    {allRooms.map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2 flex items-center gap-2">
                    <Calendar size={16} className="text-teal-600" />
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">วันที่</span>
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black outline-none focus:border-teal-500"
                    required
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2 flex items-center gap-2">
                    <Clock size={16} className="text-teal-600" />
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">เวลา</span>
                  </label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black outline-none focus:border-teal-500"
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>

                {/* Refrigerant */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2 flex items-center gap-2">
                    <Gauge size={16} className="text-teal-600" />
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">น้ำยา (PSI)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.refrigerant}
                    onChange={(e) => setFormData({...formData, refrigerant: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black outline-none focus:border-teal-500"
                    placeholder="เช่น 150, 200..."
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-black text-slate-600 mb-2 flex items-center gap-2">
                    <Filter size={16} className="text-teal-600" />
                    <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">คราบ/สถานะ</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black outline-none focus:border-teal-500"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2 flex items-center gap-2">
                  <FileText size={16} className="text-teal-600" />
                  <span className="bg-teal-100 text-teal-700 px-2 py-1 rounded-lg">อื่นๆ</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full p-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black outline-none focus:border-teal-500 resize-none"
                  rows={3}
                  placeholder="เช่น แอร์เก่าควรเปลี่ยน, คอยล์สกปรก..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-black uppercase hover:bg-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {editingRecord ? 'อัปเดตรายการ' : 'บันทึกรายการ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-black uppercase hover:bg-slate-300 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">ลำดับ</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">ห้อง</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">วันที่</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">เวลา</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">น้ำยา (PSI)</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-4 text-left text-xs font-black uppercase tracking-wider">หมายเหตุ</th>
                <th className="px-6 py-4 text-center text-xs font-black uppercase tracking-wider">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400 font-black">
                    <div className="flex flex-col items-center gap-4">
                      <Wind size={48} className="opacity-20" />
                      <p>ไม่มีข้อมูลบันทึกการทำความสะอาดแอร์</p>
                      <button
                        onClick={openAddForm}
                        className="px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-black hover:bg-teal-700 transition-all"
                      >
                        เพิ่มรายการแรก
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-900">{record.no || '-'}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{record.room || '-'}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{record.date || '-'}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{record.time || '-'}</td>
                    <td className="px-6 py-4 font-black text-slate-900">{record.refrigerant || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        record.status === 'OK' || record.status === 'พร้อมใช้งาน' 
                          ? 'bg-emerald-100 text-emerald-700'
                          : record.status === 'สกปรกมาก' || record.status === 'ต้องตรวจสอบ'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {record.status || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate" title={record.notes}>
                      {record.notes || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                          title="แก้ไข"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-all"
                          title="ลบ"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AirCleaningLog;
