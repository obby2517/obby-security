
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  LogOut, 
  Search, 
  Camera, 
  Clock,
  Home,
  CreditCard,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Timer,
  Edit2,
  Save,
  X,
  Loader2,
  ShieldCheck,
  Moon,
  Sun,
  RefreshCw,
  Maximize2,
  ChevronDown,
  History,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Visitor, VillageStats, FALLBACK_HOUSES } from './types';
import { extractVisitorInfo } from './services/geminiService';
import { sendVisitorCheckInNotification, sendVisitorCheckOutNotification } from './services/lineService';
import { fetchVisitors, createVisitor, updateVisitor, checkOutVisitor, fetchHouses } from './services/googleSheetService';

// --- Helpers ---
const compressImage = (base64Str: string, maxWidth = 1000, maxHeight = 1000): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const calculateDuration = (start: Date | string, end?: Date | string) => {
  try {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : new Date().getTime();
    const diff = endTime - startTime;
    if (isNaN(diff) || diff < 0) return "0 นาที";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours} ชม. ${minutes} น.`;
    return `${minutes} น.`;
  } catch (e) { return "0 นาที"; }
};

const CustomTooltip = ({ active, payload, isDark }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={`${isDark ? 'bg-slate-900 border-emerald-500/40' : 'bg-white border-emerald-200'} border-2 p-4 rounded-2xl shadow-2xl`}>
        <p className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-black mb-1`}>รายละเอียด</p>
        <p className={`${isDark ? 'text-slate-100' : 'text-slate-900'} font-bold text-sm mb-2`}>{data.fullRange}</p>
        <div className="flex items-center gap-3 bg-emerald-500/10 p-2 rounded-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
          <p className={`${isDark ? 'text-white' : 'text-slate-900'} text-xl font-black`}>{payload[0].value} <span className="text-xs opacity-60">คน</span></p>
        </div>
      </div>
    );
  }
  return null;
};

const ImageModal = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-300" onClose={onClose}>
    <button className="absolute top-6 right-6 p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all z-[110] active:scale-90" onClick={onClose}>
      <X className="w-8 h-8 text-white" />
    </button>
    <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
      <img src={imageUrl} className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border-4 border-white/10" alt="Full size visitor" />
    </div>
  </div>
);

const VisitorItem = ({ visitor, onCheckOut, onUpdate, onImageClick, isDark, isLoading, houseList }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Visitor>({ ...visitor });
  const isOut = visitor.status === 'OUT';

  const handleUpdate = () => {
    onUpdate(editData);
    setIsEditing(false);
  };

  const handleRestore = () => {
    setEditData({
      ...editData,
      status: 'IN',
      checkOutTime: undefined
    });
  };

  return (
    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} border-2 p-6 rounded-[2.5rem] transition-all duration-300 hover:shadow-xl ${isOut && !isEditing ? 'opacity-95' : ''}`}>
      {isEditing ? (
        <div className="space-y-4 mb-5">
          <div className="flex justify-between items-center">
            <label className={`text-[10px] font-black uppercase tracking-[3px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              แก้ไขข้อมูลผู้ติดต่อ
            </label>
            <div className="flex gap-1">
              <button onClick={() => { setIsEditing(false); setEditData({...visitor}); }} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                <X className="w-6 h-6" />
              </button>
              <button disabled={isLoading} onClick={handleUpdate} className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-xl transition-all disabled:opacity-30">
                <Save className="w-6 h-6" />
              </button>
            </div>
          </div>
          
          <div className="space-y-1">
            <span className={`text-[9px] font-black block uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ชื่อ-นามสกุล</span>
            <input 
              className={`w-full ${isDark ? 'bg-slate-950 text-white border-slate-700 focus:border-emerald-500' : 'bg-slate-50 text-slate-900 border-slate-300 focus:border-emerald-600'} border-2 rounded-2xl px-4 py-3 font-black outline-none text-xl shadow-inner transition-all`} 
              value={editData.name} 
              placeholder="ระบุชื่อ..."
              onChange={e => setEditData({...editData, name: e.target.value})} 
            />
          </div>

          <div className="flex gap-4 items-center">
             <div className={`w-16 h-16 rounded-xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} flex items-center justify-center overflow-hidden border flex-shrink-0`}>
              {visitor.photo ? (
                <img src={visitor.photo} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <CreditCard className={`${isDark ? 'text-slate-500' : 'text-slate-400'} w-6 h-6`} />
              )}
            </div>
            <div className="flex-grow space-y-1">
              <span className={`text-[9px] font-black block uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>บ้านเลขที่</span>
              <select className={`w-full ${isDark ? 'bg-slate-950 text-emerald-400 border-slate-700' : 'bg-slate-50 text-emerald-600 border-slate-300'} border-2 rounded-xl px-3 py-2 text-sm font-black outline-none`} value={editData.houseNumber} onChange={e => setEditData({...editData, houseNumber: e.target.value})}>
                {houseList.map((h: string) => <option key={h} value={h}>บ้าน {h}</option>)}
              </select>
            </div>
          </div>

          {editData.status === 'OUT' && (
            <button 
              onClick={handleRestore}
              className={`w-full py-3 ${isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border-emerald-200'} border-2 border-dashed rounded-2xl font-black text-xs flex items-center justify-center gap-2 uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all`}
            >
              <RotateCcw className="w-4 h-4" /> ดึงกลับมาเป็นสถานะ "อยู่ข้างใน (Active)"
            </button>
          )}
        </div>
      ) : (
        <div className="flex justify-between items-start mb-5">
          <div className="flex gap-4 w-full min-w-0">
            <div 
              onClick={() => visitor.photo && onImageClick(visitor.photo)}
              className={`w-20 h-20 rounded-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} flex items-center justify-center overflow-hidden flex-shrink-0 border cursor-pointer group/img relative`}
            >
              {visitor.photo ? (
                <>
                  <img src={visitor.photo} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-white" />
                  </div>
                </>
              ) : (
                <CreditCard className={`${isDark ? 'text-slate-500' : 'text-slate-400'} w-8 h-8`} />
              )}
            </div>
            <div className="flex-grow min-w-0 flex flex-col justify-center">
              <h4 className={`font-black text-2xl ${isDark ? 'text-slate-50' : 'text-slate-900'} leading-tight tracking-tight mb-1`}>{visitor.name || 'ไม่ระบุชื่อ'}</h4>
              <p className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} text-lg font-black flex items-center gap-2`}>
                <Home className="w-5 h-5" /> บ้าน {visitor.houseNumber}
              </p>
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <button disabled={isLoading} onClick={() => setIsEditing(true)} className={`${isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-400 hover:text-emerald-500'} p-2.5 hover:bg-emerald-500/10 rounded-2xl transition-all disabled:opacity-30`}>
              <Edit2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
      
      <div className={`space-y-4 mb-6 ${isDark ? 'bg-slate-950/80 border-slate-700/50 shadow-inner' : 'bg-slate-50 border-slate-200'} p-5 rounded-[1.5rem] border`}>
        <div className="flex justify-between items-center">
          <span className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>ทะเบียน:</span>
          {isEditing ? (
            <input className={`w-32 ${isDark ? 'bg-slate-900 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300'} border-2 rounded-xl px-2 py-1 font-black text-right outline-none text-xl`} value={editData.licensePlate} onChange={e => setEditData({...editData, licensePlate: e.target.value})} />
          ) : (
            <span className={`font-black text-xl ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{visitor.licensePlate || '-'}</span>
          )}
        </div>
        
        <div className={`grid ${visitor.status === 'OUT' || (isEditing && editData.status === 'OUT') ? 'grid-cols-2 gap-4' : 'grid-cols-1'} border-t pt-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="space-y-1">
            <span className={`text-[10px] font-black block uppercase tracking-tighter ${isDark ? 'text-emerald-400' : 'text-slate-400'}`}>CHECK-IN</span>
            <p className={`font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {new Date(visitor.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
            </p>
          </div>
          
          {(visitor.status === 'OUT' || (isEditing && editData.status === 'OUT')) && visitor.checkOutTime && (
            <div className="space-y-1">
              <span className={`text-[10px] font-black block uppercase tracking-tighter ${isDark ? 'text-rose-400' : 'text-slate-400'}`}>DEPARTED</span>
              <p className={`font-black text-lg ${isDark ? 'text-rose-300' : 'text-rose-600'}`}>
                {new Date(visitor.checkOutTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
              </p>
            </div>
          )}
        </div>

        <div className={`flex justify-between items-center border-t pt-4 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <span className={`font-black uppercase tracking-widest text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>ระยะเวลา:</span>
          <span className={`font-black text-lg ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {calculateDuration(visitor.checkInTime, visitor.status === 'OUT' ? visitor.checkOutTime : undefined)}
          </span>
        </div>
      </div>

      {!isOut ? (
        <button disabled={isLoading || isEditing} onClick={() => onCheckOut(visitor.id)} className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] font-black transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 text-base tracking-widest uppercase">
          {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogOut className="w-6 h-6" />} บันทึกออก
        </button>
      ) : (
        <div className={`w-full py-5 ${isDark ? 'bg-slate-800/60 text-slate-200' : 'bg-slate-100 text-slate-500'} rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 border border-dashed ${isDark ? 'border-slate-700' : 'border-slate-300'} uppercase tracking-widest`}>
           <CheckCircle2 className="w-5 h-5 text-emerald-400" /> แจ้งออกเรียบร้อย
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('guard_theme') as any) || 'dark');
  const [view, setView] = useState<'dashboard' | 'checkin' | 'checkout'>('dashboard');
  const [dashboardFilter, setDashboardFilter] = useState<'today' | 'inside' | 'out'>('today');
  const [checkoutStatusFilter, setCheckoutStatusFilter] = useState<'IN' | 'OUT' | 'ALL'>('IN');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [houseList, setHouseList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHouseLoading, setIsHouseLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState<any>({show: false, msg: '', type: 'success'});
  const [newVisitor, setNewVisitor] = useState<Partial<Visitor>>({ houseNumber: '', name: '', idNumber: '', licensePlate: '' });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const vData = await fetchVisitors();
      const sorted = (vData || []).sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
      setVisitors(sorted);
    } catch (err) {
      console.error("Load visitors failed:", err);
      setShowNotification({show: true, msg: 'ดึงข้อมูลไม่สำเร็จ', type: 'error'});
    } finally {
      setIsLoading(false);
    }
  };

  const loadHouses = async () => {
    setIsHouseLoading(true);
    try {
      const hData = await fetchHouses();
      const houses = hData && hData.length > 0 ? hData : FALLBACK_HOUSES;
      setHouseList(houses);
      if (!newVisitor.houseNumber && houses.length > 0) {
        setNewVisitor(prev => ({ ...prev, houseNumber: houses[0] }));
      }
    } catch (err) {
      console.error("Load houses failed:", err);
      setHouseList(FALLBACK_HOUSES);
    } finally {
      setIsHouseLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadHouses();
  }, []);

  useEffect(() => {
    localStorage.setItem('guard_theme', theme);
  }, [theme]);

  const isDark = theme === 'dark';

  const stats: VillageStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    return {
      totalToday: visitors.filter(v => new Date(v.checkInTime).toDateString() === todayStr).length,
      currentlyInside: visitors.filter(v => v.status === 'IN').length,
      totalOut: visitors.filter(v => v.status === 'OUT' && new Date(v.checkInTime).toDateString() === todayStr).length
    };
  }, [visitors]);

  const chartData = useMemo(() => {
    const todayStr = new Date().toDateString();
    const slots = Array.from({ length: 24 }, (_, h) => ({ time: `${h.toString().padStart(2, '0')}:00`, fullRange: `${h}:01 - ${h + 1}:00 น.`, คน: 0 }));
    visitors.filter(v => new Date(v.checkInTime).toDateString() === todayStr).forEach(v => {
      const h = new Date(v.checkInTime).getHours();
      if (h >= 0 && h < 24) slots[h].คน += 1;
    });
    return slots;
  }, [visitors]);

  const handleCheckIn = async () => {
    if (isLoading || !newVisitor.houseNumber) return;
    setIsLoading(true);
    try {
      const result = await createVisitor({
        name: newVisitor.name || 'ไม่ระบุชื่อ',
        idNumber: newVisitor.idNumber || '',
        licensePlate: newVisitor.licensePlate || '',
        houseNumber: newVisitor.houseNumber,
        photo: newVisitor.photo,
        status: 'IN'
      });

      if (result) {
        setShowNotification({show: true, msg: 'บันทึกเข้าสำเร็จ', type: 'success'});
        await loadData();
        sendVisitorCheckInNotification(result);
        setView('dashboard');
        setDashboardFilter('inside');
        setNewVisitor({ houseNumber: houseList[0] || '', name: '', idNumber: '', licensePlate: '', photo: undefined });
      }
    } catch (err) {
      setShowNotification({show: true, msg: 'เกิดข้อผิดพลาดในการบันทึก', type: 'error'});
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowNotification({show: false}), 3000);
    }
  };

  const handleCheckOut = async (id: string) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const updatedVisitorObj = await checkOutVisitor(id);
      if (updatedVisitorObj) {
        setShowNotification({ show: true, msg: 'แจ้งออกสำเร็จ', type: 'success' });
        await loadData();
        sendVisitorCheckOutNotification(updatedVisitorObj);
      }
    } catch (err) {
      setShowNotification({ show: true, msg: 'แจ้งออกล้มเหลว', type: 'error' });
    } finally {
      setIsLoading(false);
      setTimeout(() => setShowNotification({ show: false }), 3000);
    }
  };

  const onCameraCapture = async (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsScanning(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          setNewVisitor(prev => ({ ...prev, photo: compressed }));
          const result = await extractVisitorInfo(compressed);
          if (result) {
            setNewVisitor(prev => ({ 
              ...prev, 
              name: result.name || prev.name, 
              idNumber: result.idNumber || prev.idNumber, 
              licensePlate: result.licensePlate || prev.licensePlate 
            }));
          }
        } catch (err) { console.error("OCR error:", err); }
        finally { setIsScanning(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredDashboardList = useMemo(() => {
    const todayStr = new Date().toDateString();
    let list = [...visitors];
    if (dashboardFilter === 'today') list = list.filter(v => new Date(v.checkInTime).toDateString() === todayStr);
    else if (dashboardFilter === 'inside') list = list.filter(v => v.status === 'IN');
    else if (dashboardFilter === 'out') list = list.filter(v => v.status === 'OUT' && new Date(v.checkInTime).toDateString() === todayStr);
    return list;
  }, [visitors, dashboardFilter]);

  const checkoutFiltered = useMemo(() => {
    let list = [...visitors];
    if (checkoutStatusFilter !== 'ALL') {
      list = list.filter(v => v.status === checkoutStatusFilter);
    }
    
    if (checkoutStatusFilter === 'OUT' && !searchQuery) {
        const todayStr = new Date().toDateString();
        list = list.filter(v => new Date(v.checkInTime).toDateString() === todayStr);
    }

    const query = searchQuery.toLowerCase();
    return list.filter(v => (
      String(v.name || '').toLowerCase().includes(query) || 
      String(v.licensePlate || '').toLowerCase().includes(query) || 
      String(v.houseNumber || '').toLowerCase().includes(query)
    ));
  }, [visitors, searchQuery, checkoutStatusFilter]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 overflow-x-hidden ${isDark ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'}`}>
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500 rounded-full blur-[100px]"></div>
      </div>

      <header className={`sticky top-0 z-40 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'} backdrop-blur-xl border-b px-4 lg:px-8 py-3 w-full`}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-start gap-4 sm:gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 transform hover:rotate-6 transition-transform">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <h1 className="font-black text-xl tracking-tighter leading-none hidden xs:block">SmartGuard</h1>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <nav className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl border border-white/5 shrink-0">
              {[
                { id: 'dashboard', icon: LayoutDashboard, label: 'ควบคุม' },
                { id: 'checkin', icon: UserPlus, label: 'บันทึกเข้า' },
                { id: 'checkout', icon: LogOut, label: 'รายการ' }
              ].map(item => (
                <button key={item.id} onClick={() => setView(item.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${view === item.id ? 'bg-emerald-500 text-white shadow-md' : `${isDark ? 'text-slate-400' : 'text-slate-500'} hover:text-emerald-500`}`}>
                  <item.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { loadData(); loadHouses(); }} title="รีเฟรช" className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-emerald-400' : 'bg-white text-emerald-600 border border-slate-100 shadow-sm'} active:scale-90`}>
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`p-2 rounded-xl transition-all ${isDark ? 'bg-slate-800 text-yellow-400' : 'bg-white text-slate-600 border border-slate-100 shadow-sm'} active:scale-90`}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-8 space-y-8 relative z-10">
        {view === 'checkout' && (
          <div className="relative group max-w-2xl mx-auto w-full">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ, ทะเบียน, บ้านเลขที่..." 
              className={`w-full ${isDark ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900'} border-[2px] rounded-2xl pl-14 pr-8 py-3.5 font-black text-base outline-none focus:border-emerald-500 transition-all shadow-lg shadow-emerald-500/5`} 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-top-6 duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              {[
                { id: 'today', label: 'ผู้เข้าวันนี้', val: stats.totalToday, color: 'text-blue-500', activeColor: 'border-blue-500', targetStatus: 'ALL' },
                { id: 'inside', label: 'อยู่ข้างใน', val: stats.currentlyInside, color: `${isDark ? 'text-emerald-400' : 'text-emerald-600'}`, activeColor: 'border-emerald-500', targetStatus: 'IN' },
                { id: 'out', label: 'แจ้งออกวันนี้', val: stats.totalOut, color: `${isDark ? 'text-rose-400' : 'text-rose-600'}`, activeColor: 'border-rose-500', targetStatus: 'OUT' }
              ].map(s => (
                <button key={s.id} onClick={() => { setView('checkout'); setCheckoutStatusFilter(s.targetStatus as any); setSearchQuery(''); }} className={`relative group overflow-hidden p-6 rounded-[2.5rem] flex flex-col items-center justify-center text-center transition-all border-4 ${dashboardFilter === s.id ? `${isDark ? 'bg-slate-900' : 'bg-white'} ${s.activeColor} shadow-xl scale-105` : `${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'} opacity-80 hover:opacity-100`}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[3px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-1`}>{s.label}</p>
                  <h3 className={`text-4xl font-black ${s.color} tracking-tighter`}>{s.val}</h3>
                  <div className={`mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[8px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>คลิกเพื่อดูรายการ <ChevronRight className="w-2 h-2" /></div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-10">
              <div className={`xl:col-span-7 p-6 md:p-10 rounded-[3rem] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-2 h-[450px] shadow-xl relative overflow-hidden`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="text-emerald-500 w-5 h-5" />
                    <h3 className={`font-black text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>สถิติการเข้าพบ</h3>
                  </div>
                  {isLoading && <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />}
                </div>
                <ResponsiveContainer width="100%" height="80%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="5 5" vertical={false} stroke={isDark ? "#1e293b" : "#f1f5f9"} />
                    <XAxis dataKey="time" hide />
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                    <Line type="monotone" dataKey="คน" stroke="#10b981" strokeWidth={5} dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className={`xl:col-span-5 p-6 md:p-10 rounded-[3rem] ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-2 h-[450px] flex flex-col shadow-xl`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`font-black text-lg tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>รายการล่าสุด</h3>
                  <div className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black ring-1 ring-emerald-500/20 uppercase tracking-widest">{filteredDashboardList.length}</div>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {filteredDashboardList.map(v => (
                    <VisitorItem key={v.id} visitor={v} isDark={isDark} isLoading={isLoading} onCheckOut={handleCheckOut} onUpdate={(u: any) => updateVisitor(u).then(loadData)} onImageClick={setSelectedImage} houseList={houseList} />
                  ))}
                  {filteredDashboardList.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                      <Search className="w-12 h-12 mb-2" />
                      <p className="font-black uppercase tracking-widest text-[10px]">NO RECORDS</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'checkin' && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 items-stretch">
              <div className={`${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-4 border-dashed rounded-[3rem] p-8 flex flex-col items-center justify-center min-h-[400px] md:min-h-[500px] relative overflow-hidden group hover:border-emerald-500 transition-colors shadow-xl`}>
                {newVisitor.photo ? (
                  <div className="absolute inset-0 group cursor-pointer" onClick={() => setSelectedImage(newVisitor.photo!)}>
                    <img src={newVisitor.photo} className="w-full h-full object-contain" alt="Preview" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-10 h-10 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center group-hover:scale-105 transition-transform">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                      <Camera className="w-10 h-10 text-emerald-500" />
                    </div>
                    <p className={`font-black uppercase tracking-widest text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ถ่ายรูปบัตรหรือผู้ติดต่อ</p>
                  </div>
                )}
                <label className="mt-6 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black cursor-pointer shadow-lg transition-all active:scale-90 flex items-center gap-3 z-20 text-sm uppercase tracking-wider">
                  <Camera className="w-5 h-5" /> {newVisitor.photo ? 'ถ่ายใหม่' : 'เริ่มการถ่ายรูป'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onCameraCapture} />
                </label>
                
                {(isScanning || isLoading) && (
                  <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center z-30">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-6" />
                    <p className="text-white font-black animate-pulse tracking-[4px] text-[10px] text-center px-10">
                      {isScanning ? 'AI NEURAL SCANNING...' : 'UPLOADING...'}
                    </p>
                  </div>
                )}
              </div>

              <div className={`${isDark ? 'bg-slate-900 border-slate-800 shadow-emerald-500/5' : 'bg-white border-slate-200'} border-2 p-8 md:p-12 rounded-[3rem] shadow-xl space-y-6 relative overflow-hidden`}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-[3px] block ml-2 ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`}>บ้านเลขที่ปลายทาง</label>
                    <div className="relative">
                      <input 
                        list="house-numbers"
                        className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border-[2.5px] rounded-2xl px-5 py-4 font-black text-lg outline-none focus:border-emerald-500 transition-all shadow-inner`}
                        placeholder="พิมพ์เลขที่บ้าน..."
                        value={newVisitor.houseNumber}
                        onChange={e => setNewVisitor({ ...newVisitor, houseNumber: e.target.value })}
                        disabled={isHouseLoading}
                      />
                      {isHouseLoading ? (
                        <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 animate-spin w-5 h-5" />
                      ) : (
                        <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                      )}
                      <datalist id="house-numbers">
                        {houseList.map(h => <option key={h} value={h} />)}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-[10px] font-black uppercase tracking-[3px] block ml-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>ชื่อผู้ติดต่อ</label>
                    <input type="text" placeholder="ระบุชื่อ..." className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border-[2.5px] rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 transition-all`} value={newVisitor.name} onChange={e => setNewVisitor({ ...newVisitor, name: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-[3px] block ml-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>เลขบัตร/ID</label>
                      <input type="text" placeholder="13 หลัก..." className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border-[2.5px] rounded-2xl px-5 py-4 font-black outline-none focus:border-emerald-500 transition-all tracking-wider`} value={newVisitor.idNumber} onChange={e => setNewVisitor({ ...newVisitor, idNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[10px] font-black uppercase tracking-[3px] block ml-2 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>ทะเบียนรถ</label>
                      <input type="text" placeholder="กข-1234..." className={`w-full ${isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border-[2.5px] rounded-2xl px-5 py-4 font-black text-lg uppercase outline-none focus:border-emerald-500 transition-all`} value={newVisitor.licensePlate} onChange={e => setNewVisitor({ ...newVisitor, licensePlate: e.target.value })} />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleCheckIn} 
                  disabled={isScanning || isLoading || !newVisitor.houseNumber} 
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-black text-lg shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 uppercase tracking-widest"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />} 
                  ยืนยันบันทึกเข้า
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'checkout' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                 <h2 className={`text-2xl font-black flex items-center gap-3 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <div className="w-2 h-8 bg-emerald-500 rounded-full"></div> 
                  จัดการรายการผู้ติดต่อ
                  <span className={`opacity-40 ml-1 font-black ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>/ {checkoutFiltered.length}</span>
                </h2>
                <div className={`flex items-center gap-2 ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-200/50 border-white/5'} p-1 rounded-xl w-fit border`}>
                  <button 
                    onClick={() => setCheckoutStatusFilter('IN')} 
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${checkoutStatusFilter === 'IN' ? 'bg-emerald-500 text-white shadow-md' : `${isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-500'}`}`}
                  >
                    <Clock className="w-3.5 h-3.5" /> อยู่ข้างใน (Active)
                  </button>
                  <button 
                    onClick={() => setCheckoutStatusFilter('OUT')} 
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${checkoutStatusFilter === 'OUT' ? 'bg-rose-500 text-white shadow-md' : `${isDark ? 'text-slate-400 hover:text-rose-400' : 'text-slate-500 hover:text-rose-500'}`}`}
                  >
                    <History className="w-3.5 h-3.5" /> แจ้งออกแล้ว (History)
                  </button>
                  <button 
                    onClick={() => setCheckoutStatusFilter('ALL')} 
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-black transition-all ${checkoutStatusFilter === 'ALL' ? 'bg-blue-500 text-white shadow-md' : `${isDark ? 'text-slate-400 hover:text-blue-400' : 'text-slate-500 hover:text-blue-500'}`}`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" /> ทั้งหมด
                  </button>
                </div>
              </div>
              {isLoading && <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {checkoutFiltered.map(v => (
                <VisitorItem key={v.id} visitor={v} isLoading={isLoading} onCheckOut={handleCheckOut} onUpdate={(u: any) => updateVisitor(u).then(loadData)} onImageClick={setSelectedImage} isDark={isDark} houseList={houseList} />
              ))}
              {checkoutFiltered.length === 0 && !isLoading && (
                <div className="col-span-full py-24 text-center opacity-30 flex flex-col items-center">
                  <ShieldCheck className={`w-16 h-16 mb-4 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                  <p className={`text-xl font-black uppercase tracking-[5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {checkoutStatusFilter === 'OUT' ? 'วันนี้ยังไม่มีผู้แจ้งออก' : 'ไม่มีรายการผู้ติดต่อ'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}

      <footer className={`py-8 text-center text-[10px] font-black uppercase tracking-[5px] opacity-30 ${isDark ? 'text-slate-400' : 'text-slate-900'} relative z-10`}>
        SMART VILLAGE GUARD • SECURE PROTOCOL V4.8.0
      </footer>

      {showNotification.show && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] ${showNotification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'} text-white px-8 py-4 rounded-2xl shadow-2xl font-black flex items-center gap-3 border-2 ${showNotification.type === 'error' ? 'border-rose-400' : 'border-emerald-400'} animate-in slide-in-from-bottom-20`}>
          {showNotification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          {showNotification.msg}
        </div>
      )}
    </div>
  );
}
