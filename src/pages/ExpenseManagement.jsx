import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  DollarSign, 
  PlusCircle, 
  Trash2, 
  Search, 
  Loader2,
  AlertCircle,
  TrendingDown,
  Calendar,
  User,
  Info,
  ExternalLink,
  ImageIcon
} from 'lucide-react';

const Finance = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newLog, setNewLog] = useState({ 
    roomOrBuilding: '', 
    details: '', 
    category: 'Maintenance', 
    actualCost: '', 
    receiptUrl: '' 
  });

  // Real-time listener
  useEffect(() => {
    // Note: Reusing 'maintenance_logs' as the single source for Finance/Expenses
    const q = query(collection(db, 'apartments', 'apartcloud-service', 'maintenance_logs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLogs(data);
      setLoading(false);
    }, (error) => {
      console.error("Finance Listener Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ADD LOG
  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.roomOrBuilding.trim() || !newLog.actualCost) return alert("Please fill in required fields");
    
    try {
      await addDoc(collection(db, 'apartments', 'apartcloud-service', 'maintenance_logs'), {
        ...newLog,
        roomOrBuilding: newLog.roomOrBuilding.trim(),
        details: newLog.details.trim(),
        actualCost: Number(newLog.actualCost),
        createdAt: new Date().toISOString(),
        serverTimestamp: serverTimestamp()
      });
      setNewLog({ roomOrBuilding: '', details: '', category: 'Maintenance', actualCost: '', receiptUrl: '' });
      setIsAdding(false);
    } catch (err) {
      console.error("Add Log Error:", err);
      alert("Failed to save log: " + err.message);
    }
  };

  // DELETE LOG
  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Delete this log permanently?")) return;
    try {
      await deleteDoc(doc(db, 'apartments', 'apartcloud-service', 'maintenance_logs', logId));
    } catch (err) {
      console.error("Delete Log Error:", err);
      alert("Failed to delete log: " + err.message);
    }
  };

  const filteredLogs = logs.filter(log => 
    log.roomOrBuilding?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalExpenses = logs.reduce((sum, log) => sum + (Number(log.actualCost) || 0), 0);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header - Always Rendered */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
              <DollarSign className="text-emerald-400" size={32} />
              Finance Center
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Expense Logging & AI Receipt Archive</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400" size={18} />
              <input 
                type="text" 
                placeholder="Search logs..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-emerald-500/50 transition-all text-white"
              />
            </div>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
            >
              <PlusCircle size={18} />
              {isAdding ? 'Close' : 'Log New Expense'}
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Recorded Expenses</p>
              <p className="text-3xl font-black text-emerald-400">{totalExpenses.toLocaleString()} ฿</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
              <TrendingDown size={24} />
            </div>
          </div>
          <div className="bg-slate-900/60 border border-white/5 p-6 rounded-[2rem] flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1">Total Records</p>
              <p className="text-3xl font-black text-white">{logs.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-slate-400">
              <Calendar size={24} />
            </div>
          </div>
        </div>

        {/* Add Log Panel */}
        {isAdding && (
          <form onSubmit={handleAddLog} className="bg-slate-900/80 border border-emerald-500/20 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top duration-300">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Entity (Room/Building)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Room 402"
                  value={newLog.roomOrBuilding}
                  onChange={e => setNewLog({...newLog, roomOrBuilding: e.target.value})}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Category</label>
                <select 
                  value={newLog.category}
                  onChange={e => setNewLog({...newLog, category: e.target.value})}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500 appearance-none"
                >
                  <option value="Maintenance">Maintenance</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Expense Amount (฿)</label>
                <input 
                  type="number" 
                  placeholder="0.00"
                  value={newLog.actualCost}
                  onChange={e => setNewLog({...newLog, actualCost: e.target.value})}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Receipt URL (Optional)</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  value={newLog.receiptUrl}
                  onChange={e => setNewLog({...newLog, receiptUrl: e.target.value})}
                  className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="space-y-4 flex flex-col">
              <div className="space-y-1 flex-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Details / Notes</label>
                <textarea 
                  placeholder="What was this expense for?"
                  value={newLog.details}
                  onChange={e => setNewLog({...newLog, details: e.target.value})}
                  className="w-full h-full min-h-[100px] bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-500 resize-none"
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all">
                Save Expense
              </button>
            </div>
          </form>
        )}

        {/* Table Container - Always Rendered */}
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/10">
                  <th className="py-6 px-8"><User size={12} className="inline mr-2 mb-0.5"/>Entity</th>
                  <th className="py-6 px-8">Category</th>
                  <th className="py-6 px-8 text-right">Expense (฿)</th>
                  <th className="py-6 px-8 text-center">Receipt</th>
                  <th className="py-6 px-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-emerald-400" size={40} />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Accessing Financial Records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-5 px-8">
                        <p className="font-black text-white uppercase text-sm tracking-tight">{log.roomOrBuilding}</p>
                        <p className="text-[10px] font-bold text-slate-500 truncate max-w-[200px]">{log.details}</p>
                      </td>
                      <td className="py-5 px-8">
                        <span className="text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border border-white/5 bg-slate-800 text-slate-400">
                          {log.category}
                        </span>
                      </td>
                      <td className="py-5 px-8 text-right font-black text-emerald-400 text-lg">
                        {(Number(log.actualCost) || 0).toLocaleString()}
                      </td>
                      <td className="py-5 px-8 text-center">
                        {log.receiptUrl ? (
                          <a 
                            href={log.receiptUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all mx-auto"
                          >
                            <ImageIcon size={18} />
                          </a>
                        ) : (
                          <span className="text-[9px] font-black text-slate-800 uppercase tracking-widest">No File</span>
                        )}
                      </td>
                      <td className="py-5 px-8 text-right">
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="w-10 h-10 bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-32 text-center space-y-4 opacity-30">
                      <AlertCircle size={64} className="mx-auto text-slate-600" />
                      <p className="font-black uppercase tracking-[0.3em] text-sm text-slate-400">
                        No financial records found
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 p-6 rounded-3xl flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
            <Info size={20} />
          </div>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">
            All expenses are synced with the property database. Receipt URLs point to secure Firestore document storage. 
            For bulk exports, please contact system administration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Finance;
