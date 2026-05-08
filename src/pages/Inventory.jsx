import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Package, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  PlusCircle, 
  Loader2,
  AlertCircle,
  Wrench,
  ShoppingBag,
  Tag,
  Hash,
  Layers,
  Box
} from 'lucide-react';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'Maintenance', stock: 0, unit: 'pcs' });

  // Real-time listener
  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    }, (error) => {
      console.error("Inventory Listener Error:", error);
      setItems([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ADD ITEM
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) return alert("Please enter item name");
    
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        name: newItem.name.trim(),
        stock: Number(newItem.stock),
        createdAt: serverTimestamp()
      });
      setNewItem({ name: '', category: 'Maintenance', stock: 0, unit: 'pcs' });
      setIsAdding(false);
    } catch (err) {
      console.error("Add Error:", err);
      alert("Failed to add item: " + err.message);
    }
  };

  // UPDATE STOCK
  const handleUpdateStock = async (itemId, currentStock, amount) => {
    try {
      const newStock = Math.max(0, Number(currentStock) + amount);
      const itemRef = doc(db, 'inventory', itemId);
      await updateDoc(itemRef, {
        stock: newStock,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Update Error:", err);
      alert("Failed to update stock: " + err.message);
    }
  };

  // DELETE ITEM
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Delete this item permanently?")) return;
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (err) {
      console.error("Delete Error:", err);
      alert("Failed to delete item: " + err.message);
    }
  };

  if (!items) return <div className="p-10 text-white font-black uppercase tracking-widest animate-pulse">Loading Inventory...</div>;

  const filteredItems = (Array.isArray(items) ? items : []).filter(item => 
    item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item?.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header - Always Rendered */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
              <Package className="text-indigo-400" size={32} />
              Building Inventory
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Property Management Stock Control</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative group w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400" size={18} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-indigo-500/50 transition-all text-white"
              />
            </div>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95"
            >
              <PlusCircle size={18} />
              {isAdding ? 'Close' : 'Add New Item'}
            </button>
          </div>
        </div>

        {/* Add Form Panel */}
        {isAdding && (
          <form onSubmit={handleAddItem} className="bg-slate-900/80 border border-indigo-500/20 p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 animate-in slide-in-from-top duration-300">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Item Name</label>
              <input 
                type="text" 
                placeholder="e.g. LED Bulb"
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Category</label>
              <select 
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value})}
                className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500 appearance-none"
              >
                <option value="Maintenance">Maintenance</option>
                <option value="Housekeeping">Housekeeping</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Initial Stock & Unit</label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="0"
                  value={newItem.stock}
                  onChange={e => setNewItem({...newItem, stock: e.target.value})}
                  className="w-20 bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-black text-white outline-none focus:border-indigo-500"
                />
                <input 
                  type="text" 
                  placeholder="pcs"
                  value={newItem.unit}
                  onChange={e => setNewItem({...newItem, unit: e.target.value})}
                  className="flex-1 bg-slate-800 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all">
                Save to Database
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
                  <th className="py-6 px-8"><Tag size={12} className="inline mr-2 mb-0.5"/>Item Name</th>
                  <th className="py-6 px-8"><Layers size={12} className="inline mr-2 mb-0.5"/>Category</th>
                  <th className="py-6 px-8 text-center"><Box size={12} className="inline mr-2 mb-0.5"/>Stock</th>
                  <th className="py-6 px-8 text-center"><Hash size={12} className="inline mr-2 mb-0.5"/>Unit</th>
                  <th className="py-6 px-8 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="animate-spin text-indigo-400" size={40} />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Syncing with Firestore...</p>
                      </div>
                    </td>
                  </tr>
                ) : Array.isArray(filteredItems) && filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-5 px-8 font-black text-white uppercase text-sm tracking-tight">{item.name}</td>
                      <td className="py-5 px-8">
                        <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase border ${
                          item.category === 'Maintenance' 
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-5 px-8 text-center">
                        <p className={`text-2xl font-black ${Number(item.stock) <= 5 ? 'text-rose-500' : 'text-white'}`}>
                          {item.stock}
                        </p>
                      </td>
                      <td className="py-5 px-8 text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase">{item.unit || 'pcs'}</p>
                      </td>
                      <td className="py-5 px-8 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleUpdateStock(item.id, item.stock, 1)}
                            className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                          >
                            <Plus size={18} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStock(item.id, item.stock, -1)}
                            className="w-10 h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                            <Minus size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="w-10 h-10 bg-slate-800 text-slate-500 rounded-xl flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all ml-2"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-32 text-center space-y-4 opacity-30">
                      <AlertCircle size={64} className="mx-auto text-slate-600" />
                      <p className="font-black uppercase tracking-[0.3em] text-sm text-slate-400">
                        Please add your first item
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em] italic">
            ApartCloud Terminal • Property Management System
          </p>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
