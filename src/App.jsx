import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { 
  MapPin, 
  BarChart3, 
  PlusCircle, 
  List, 
  X, 
  User, 
  AlertTriangle, 
  Camera, 
  ChevronRight, 
  Trash2, 
  LogOut, 
  Loader2,
  ShieldCheck,
  Flower2
} from 'lucide-react';

/**
 * [물금동아 데이지 프로젝트 최종본]
 * 🌼 디자인: '데', '이', '지' 한 줄 레이아웃
 * 🌼 로그인: '학번_이름' 가이드
 */

const firebaseConfig = {
  apiKey: "AIzaSyBYfwtdXjz4ekJbH83merNVPZemb_bc3NE",
  authDomain: "fourseason-run-and-map.firebaseapp.com",
  projectId: "fourseason-run-and-map",
  storageBucket: "fourseason-run-and-map.firebasestorage.app",
  messagingSenderId: "671510183044",
  appId: "1:671510183044:web:59ad0cc29cf6bd98f3d6d1",
  databaseURL: "https://fourseason-run-and-map-default-rtdb.firebaseio.com/" 
};

const appId = 'mulgeum-daisy-v1';
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const TRASH_CATEGORIES = [
  { id: 'cup', label: '일회용 컵', color: '#f59e0b', icon: '🥤' },
  { id: 'smoke', label: '담배꽁초', color: '#78350f', icon: '🚬' },
  { id: 'plastic', label: '플라스틱/비닐', color: '#3b82f6', icon: '🛍️' },
  { id: 'bulky', label: '대형 폐기물', color: '#4b5563', icon: '📦' },
  { id: 'etc', label: '기타 쓰레기', color: '#9ca3af', icon: '❓' },
];

const AREAS = ["물금읍", "증산리", "가촌리", "범어리", "기타 구역"];
const INITIAL_CENTER = [35.327, 129.007]; 

const DaisyLetter = ({ letter }) => (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', margin: '0 1px', verticalAlign: 'middle' }}>
    <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%' }}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse key={angle} cx="50" cy="25" rx="12" ry="25" fill="white" transform={`rotate(${angle} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="18" fill="#fbbf24" />
    </svg>
    <span style={{ position: 'relative', zIndex: 1, fontWeight: '900', fontSize: '13px', color: '#451a03' }}>{letter}</span>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState(localStorage.getItem('team_nickname') || '');
  const [isSettingNickname, setIsSettingNickname] = useState(!localStorage.getItem('team_nickname'));
  const [activeTab, setActiveTab] = useState('map');
  const [reports, setReports] = useState([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  
  const mapContainerRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef({});
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  const [formData, setFormData] = useState({
    category: 'cup', area: AREAS[0], description: '', status: 'pending', customLocation: null, image: null
  });

  const isAdmin = nickname.toLowerCase() === 'admin';

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const reportsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const unsubscribe = onSnapshot(reportsCollection, (snapshot) => {
      const formatted = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.discoveredTime).getTime() - new Date(a.discoveredTime).getTime());
      setReports(formatted);
      updateMarkers(formatted);
    });
    return () => unsubscribe();
  }, [user, nickname]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true; script.onload = () => setIsScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (isScriptLoaded && !isSettingNickname && activeTab === 'map' && mapContainerRef.current) {
      if (!leafletMap.current) {
        setTimeout(() => {
          if (!mapContainerRef.current) return;
          leafletMap.current = window.L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView(INITIAL_CENTER, 14);
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap.current);
          updateMarkers(reports);
        }, 300);
      } else { leafletMap.current.invalidateSize(); }
    }
  }, [isScriptLoaded, activeTab, isSettingNickname]);

  const updateMarkers = (data) => {
    if (!window.L || !leafletMap.current) return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    data.forEach(report => {
      if (!report.location) return;
      const cat = TRASH_CATEGORIES.find(c => c.id === report.category) || TRASH_CATEGORIES[4];
      const pinColor = isAdmin ? '#ef4444' : (report.userName === nickname ? '#fbbf24' : '#fff');
      const iconHtml = `<div style="background-color:${cat.color}; width:30px; height:30px; border-radius:10px; border:2px solid ${pinColor}; display:flex; align-items:center; justify-content:center; font-size:16px; transform:rotate(45deg); box-shadow: 0 4px 12px rgba(0,0,0,0.15);"><div style="transform:rotate(-45deg)">${cat.icon}</div></div>`;
      const icon = window.L.divIcon({ html: iconHtml, className: 'custom-pin', iconSize: [30, 30], iconAnchor: [15, 15] });
      const marker = window.L.marker([report.location.lat, report.location.lng], { icon }).addTo(leafletMap.current);
      marker.bindPopup(`<b>${cat.icon} ${cat.label}</b><br/><small>기록: ${report.userName}</small>`);
      markersRef.current[report.id] = marker;
    });
  };

  const handleLogout = () => {
    if (window.confirm("로그아웃하시겠습니까?")) {
      localStorage.removeItem('team_nickname');
      setNickname('');
      setIsSettingNickname(true);
      signOut(auth);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    localStorage.setItem('team_nickname', nickname);
    setIsSettingNickname(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      const center = leafletMap.current ? leafletMap.current.getCenter() : { lat: INITIAL_CENTER[0], lng: INITIAL_CENTER[1] };
      const loc = formData.customLocation || { lat: center.lat, lng: center.lng };
      const coll = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
      await addDoc(coll, { ...formData, location: loc, userName: nickname, discoveredTime: new Date().toISOString() });
      setFormData({ category: 'cup', area: AREAS[0], description: '', status: 'pending', customLocation: null, image: null });
      setActiveTab('map');
      alert("지도에 업로드되었습니다! 🌼");
    } catch (err) { alert("실패!"); } finally { setIsUploading(false); }
  };

  if (isSettingNickname) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#fefce8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#fbbf24', width: '70px', height: '70px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Flower2 size={40} color="white" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#92400e', margin: '0 0 16px 0' }}>물금동아</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DaisyLetter letter="데" /><span style={{ fontSize: '13px', fontWeight: '800', color: '#92400e' }}>이터를</span>
            <DaisyLetter letter="이" /><span style={{ fontSize: '13px', fontWeight: '800', color: '#92400e' }}>용한</span>
            <DaisyLetter letter="지" /><span style={{ fontSize: '13px', fontWeight: '800', color: '#92400e' }}>역 쓰레기 해결 프로젝트</span>
          </div>
        </div>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '40px', width: '100%', maxWidth: '360px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#78350f', marginBottom: '8px' }}>반가워요 활동가님!</h2>
          <form onSubmit={handleJoin}>
            <input type="text" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="예: 학번_이름" style={{ width: '100%', padding: '16px', borderRadius: '20px', backgroundColor: '#fefce8', border: '2px solid #fde68a', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '24px' }} autoFocus />
            <button type="submit" style={{ width: '100%', backgroundColor: '#fbbf24', color: 'white', border: 'none', fontWeight: '900', borderRadius: '20px', padding: '18px', fontSize: '1.1rem', cursor: 'pointer' }}>프로젝트 합류하기</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#fefce8' }}>
      <header style={{ height: '65px', backgroundColor: 'white', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flower2 size={20} color="#fbbf24" />
          <span style={{ fontSize: '14px', fontWeight: '900', color: '#92400e' }}>물금동아 데이지</span>
        </div>
        <button onClick={handleLogout} style={{ border: 'none', background: '#fefce8', padding: '8px', borderRadius: '10px', color: '#b45309' }}><LogOut size={16}/></button>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, visibility: activeTab === 'map' ? 'visible' : 'hidden' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          <button onClick={() => setActiveTab('add')} style={{ position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#78350f', color: 'white', border: 'none', fontWeight: '900', borderRadius: '30px', padding: '15px 30px', zIndex: 1001, boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>기록하기 +</button>
        </div>

        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#fefce8', display: activeTab === 'add' ? 'block' : 'none', padding: '24px', overflowY: 'auto', zIndex: 2000 }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
             <h2 style={{ fontWeight: '900', color: '#78350f' }}>새 기록</h2>
             <button onClick={() => setActiveTab('map')} style={{ border: 'none', background: 'none' }}><X/></button>
           </div>
           <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <select value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} style={{ padding: '15px', borderRadius: '15px', border: '2px solid #fde68a' }}>
               {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
             </select>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
               {TRASH_CATEGORIES.map(c => (
                 <button key={c.id} type="button" onClick={() => setFormData({...formData, category: c.id})} style={{ padding: '15px', borderRadius: '15px', border: '2px solid', borderColor: formData.category === c.id ? '#fbbf24' : 'transparent', background: 'white' }}>
                   {c.icon} {c.label}
                 </button>
               ))}
             </div>
             <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="내용을 적어주세요" style={{ padding: '15px', borderRadius: '15px', height: '100px', border: '2px solid #fde68a' }} />
             <button disabled={isUploading} style={{ backgroundColor: '#fbbf24', color: 'white', padding: '20px', borderRadius: '20px', border: 'none', fontWeight: '900' }}>
               {isUploading ? "업로드 중..." : "지도에 업로드"}
             </button>
           </form>
        </div>

        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#fefce8', display: activeTab === 'list' ? 'block' : 'none', padding: '24px', overflowY: 'auto' }}>
           <h2 style={{ fontWeight: '900', color: '#78350f', marginBottom: '20px' }}>활동 피드</h2>
           {reports.map(r => (
             <div key={r.id} style={{ background: 'white', padding: '20px', borderRadius: '20px', marginBottom: '15px', border: '1px solid #fde68a' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                 <span style={{ fontWeight: '900' }}>{TRASH_CATEGORIES.find(c => c.id === r.category)?.icon} {r.area}</span>
                 <span style={{ fontSize: '12px', color: '#92400e' }}>{r.userName}</span>
               </div>
               <p style={{ margin: '10px 0', fontSize: '14px' }}>{r.description}</p>
               {(r.userName === nickname || isAdmin) && <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id))} style={{ border: 'none', background: 'none', color: '#ef4444' }}><Trash2 size={16}/></button>}
             </div>
           ))}
        </div>
      </main>

      <nav style={{ height: '70px', backgroundColor: 'white', borderTop: '1px solid #fde68a', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
        <button onClick={() => setActiveTab('map')} style={{ border: 'none', background: 'none', color: activeTab === 'map' ? '#fbbf24' : '#d97706' }}><MapPin/></button>
        <button onClick={() => setActiveTab('list')} style={{ border: 'none', background: 'none', color: activeTab === 'list' ? '#fbbf24' : '#d97706' }}><List/></button>
      </nav>
      <style>{` .custom-pin { background: none !important; border: none !important; } `}</style>
    </div>
  );
}