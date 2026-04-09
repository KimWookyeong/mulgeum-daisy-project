import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signOut,
  signInWithCustomToken 
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
  Navigation, 
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
 * [물금동아 - 데이터 이용 지역쓰레기 해결 프로젝트 최종본]
 * 🌼 디자인: '데', '이', '지' 꽃 아이콘 적용 및 한 줄 정렬 레이아웃
 * 🌼 로그인: '학번_이름' 형식의 가이드 적용
 * 🌼 기능: 관리자 모드(admin), 사진 압축, 즉시 인증 로직 포함
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

// 물금동아 전용 데이터 경로 (appId) - 기존 사계절 데이터와 분리
const appId = 'mulgeum-daisy-final';

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

// 데이지 꽃 글자 컴포넌트
const DaisyLetter = ({ letter }) => (
  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', margin: '0 1px', verticalAlign: 'middle' }}>
    <svg viewBox="0 0 100 100" style={{ position: 'absolute', width: '100%', height: '100%', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}>
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <ellipse key={angle} cx="50" cy="25" rx="12" ry="25" fill="white" transform={`rotate(${angle} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="18" fill="#fbbf24" />
    </svg>
    <span style={{ position: 'relative', zIndex: 1, fontWeight: '900', fontSize: '12px', color: '#451a03', marginTop: '1px' }}>{letter}</span>
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
    category: 'cup',
    area: AREAS[0],
    description: '',
    status: 'pending',
    customLocation: null,
    image: null
  });

  const isAdmin = nickname.toLowerCase() === 'admin';

  // 이미지 압축 로직
  const compressImage = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) { 
          ctx.drawImage(img, 0, 0, width, height); 
          resolve(canvas.toDataURL('image/jpeg', 0.6)); 
        }
      };
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (typeof event.target?.result === 'string') {
        const compressed = await compressImage(event.target.result);
        setFormData(prev => ({ ...prev, image: compressed }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Auth 초기화
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) { console.error("Auth init error:", e); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 실시간 데이터 수신
  useEffect(() => {
    if (!user) return;
    const reportsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
    const unsubscribe = onSnapshot(reportsCollection, (snapshot) => {
      const formatted = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.discoveredTime).getTime() - new Date(a.discoveredTime).getTime());
      setReports(formatted);
      updateMarkers(formatted);
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, [user]);

  // 지도 라이브러리 로드
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true; 
    script.onload = () => setIsScriptLoaded(true);
    document.head.appendChild(script);
    return () => { if (leafletMap.current) leafletMap.current.remove(); };
  }, []);

  // 지도 초기화 및 크기 보정
  useEffect(() => {
    if (isScriptLoaded && !isSettingNickname && activeTab === 'map' && mapContainerRef.current) {
      if (!leafletMap.current) {
        setTimeout(() => {
          if (!mapContainerRef.current) return;
          leafletMap.current = window.L.map(mapContainerRef.current, { 
            zoomControl: false, 
            attributionControl: false 
          }).setView(INITIAL_CENTER, 14);
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletMap.current);
          updateMarkers(reports);
          setTimeout(() => leafletMap.current?.invalidateSize(), 400);
        }, 300);
      } else {
        leafletMap.current.invalidateSize();
      }
    }
  }, [isScriptLoaded, activeTab, isSettingNickname]);

  const updateMarkers = (data) => {
    if (!window.L || !leafletMap.current) return;
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};
    data.forEach(report => {
      if (!report.location) return;
      const cat = TRASH_CATEGORIES.find(c => c.id === report.category) || TRASH_CATEGORIES[4];
      const isMine = report.userName === nickname;
      const pinColor = isAdmin ? '#ef4444' : (isMine ? '#fbbf24' : '#fff');
      
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
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
      signOut(auth);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setIsLoggingIn(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      localStorage.setItem('team_nickname', nickname);
      setIsSettingNickname(false);
    } catch (err) {
      alert("로그인 처리 중 오류 발생");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!auth.currentUser) {
      try { await signInAnonymously(auth); } catch (err) { return alert("인증 실패!"); }
    }
    
    let loc = formData.customLocation;
    if (!loc && leafletMap.current) {
      const center = leafletMap.current.getCenter();
      loc = { lat: center.lat, lng: center.lng };
    }

    setIsUploading(true);
    try {
      const reportsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
      await addDoc(reportsCollection, { 
        ...formData, 
        location: loc || { lat: INITIAL_CENTER[0], lng: INITIAL_CENTER[1] }, 
        userName: nickname, 
        discoveredTime: new Date().toISOString() 
      });
      setFormData({ category: 'cup', area: AREAS[0], description: '', status: 'pending', customLocation: null, image: null });
      setActiveTab('map');
      alert("기록이 업로드되었습니다! 🌼");
    } catch (err) {
      alert("업로드 실패!");
    } finally {
      setIsUploading(false);
    }
  };

  const getGPS = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setFormData(prev => ({ ...prev, customLocation: coords }));
        setIsLocating(false);
        if (leafletMap.current) leafletMap.current.setView([coords.lat, coords.lng], 16);
      },
      () => { setIsLocating(false); alert("GPS 수신 실패"); },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const clearAllData = async () => {
    if (!isAdmin) return;
    if (window.confirm("🚨 경고: 모든 데이터를 영구 삭제하시겠습니까?")) {
      try {
        const reportsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'reports');
        const snapshot = await getDocs(reportsCollection);
        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        alert("초기화 완료!");
      } catch (err) { alert("삭제 오류"); }
    }
  };

  if (isSettingNickname) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#fefce8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
        <div style={{ marginBottom: '40px', textAlign: 'center', width: '100%' }}>
          <div style={{ backgroundColor: '#fbbf24', width: '70px', height: '70px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', transform: 'rotate(-5deg)', boxShadow: '0 8px 20px rgba(251,191,36,0.2)' }}>
            <Flower2 size={40} color="white" />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#92400e', margin: '0 0 16px 0', letterSpacing: '-0.02em' }}>물금동아</h1>
          
          {/* 한 줄 정렬 레이아웃 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <DaisyLetter letter="데" /><span style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', margin: '0 1px' }}>이터를</span>
            <DaisyLetter letter="이" /><span style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', margin: '0 1px' }}>용한</span>
            <DaisyLetter letter="지" /><span style={{ fontSize: '11px', fontWeight: '800', color: '#92400e', margin: '0 1px' }}>역 쓰레기 해결 프로젝트</span>
          </div>
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '40px', boxShadow: '0 20px 50px rgba(146,64,14,0.08)', width: '100%', maxWidth: '360px', textAlign: 'center', border: '1px solid #fef3c7' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '900', color: '#78350f', marginBottom: '8px' }}>반가워요 활동가님!</h2>
          <p style={{ fontSize: '0.85rem', color: '#92400e', marginBottom: '28px', lineHeight: '1.6', opacity: 0.8 }}>정보를 입력하고 프로젝트에 합류하세요.</p>
          <form onSubmit={handleJoin}>
            <input 
              type="text" 
              value={nickname} 
              onChange={e => setNickname(e.target.value)} 
              placeholder="예: 학번_이름" 
              style={{ width: '100%', padding: '16px', borderRadius: '20px', backgroundColor: '#fefce8', border: '2px solid #fde68a', outline: 'none', fontWeight: 'bold', textAlign: 'center', color: '#92400e', fontSize: '1.1rem', marginBottom: '24px' }} 
              autoFocus 
            />
            <button type="submit" disabled={isLoggingIn} style={{ width: '100%', backgroundColor: '#fbbf24', color: 'white', border: 'none', fontWeight: '900', borderRadius: '20px', padding: '18px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(251,191,36,0.3)' }}>
              {isLoggingIn ? <Loader2 className="animate-spin" /> : <>프로젝트 합류하기 <ChevronRight size={20}/></>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const solvedCount = reports.filter(r => r.status === 'solved').length;

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#fefce8', fontFamily: '-apple-system, sans-serif' }}>
      <header style={{ height: '65px', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ backgroundColor: isAdmin ? '#ef4444' : '#fbbf24', padding: '6px', borderRadius: '10px', color: 'white' }}>
            {isAdmin ? <ShieldCheck size={16} fill="white"/> : <Flower2 size={16} />}
          </div>
          <span style={{ fontSize: '14px', fontWeight: '900', color: '#92400e' }}>물금동아 데이지</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ backgroundColor: isAdmin ? '#fef2f2' : '#fefce8', color: isAdmin ? '#ef4444' : '#92400e', fontWeight: '900', fontSize: '10px', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${isAdmin ? '#fecaca' : '#fde68a'}` }}>
            {isAdmin ? 'ADMIN' : nickname}
          </span>
          <button onClick={handleLogout} style={{ border: 'none', background: '#fffbeb', padding: '8px', borderRadius: '10px', color: '#b45309', cursor: 'pointer' }}><LogOut size={16}/></button>
        </div>
      </header>

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, visibility: activeTab === 'map' ? 'visible' : 'hidden', opacity: activeTab === 'map' ? 1 : 0, transition: 'opacity 0.3s' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          <div style={{ position: 'absolute', bottom: '24px', left: '16px', right: '16px', zIndex: 1001 }}>
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '32px', boxShadow: '0 15px 35px rgba(146,64,14,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #fefce8' }}>
               <div style={{ display: 'flex', gap: '20px', paddingLeft: '10px' }}>
                 <div style={{ textAlign: 'center' }}><p style={{ fontSize: '8px', fontWeight: '900', color: '#d97706', textTransform: 'uppercase', opacity: 0.5 }}>Found</p><p style={{ fontSize: '20px', fontWeight: '900', color: '#78350f', margin: 0 }}>{reports.length}</p></div>
                 <div style={{ borderLeft: '1px solid #fff7ed', paddingLeft: '20px', textAlign: 'center' }}><p style={{ fontSize: '8px', fontWeight: '900', color: '#d97706', textTransform: 'uppercase', opacity: 0.5 }}>Solved</p><p style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24', margin: 0 }}>{solvedCount}</p></div>
               </div>
               <button onClick={() => setActiveTab('add')} style={{ backgroundColor: '#78350f', color: 'white', border: 'none', fontWeight: '900', borderRadius: '20px', padding: '14px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(120,53,15,0.2)' }}><PlusCircle size={18}/> 기록하기</button>
            </div>
          </div>
        </div>

        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#fefce8', transform: activeTab === 'add' ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)', zIndex: 2000, overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '400px', margin: '0 auto', paddingBottom: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#78350f', margin: 0 }}>NEW RECORD</h2>
              <button onClick={() => setActiveTab('map')} style={{ border: 'none', background: 'white', padding: '10px', borderRadius: '14px', color: '#d97706', cursor: 'pointer' }}><X/></button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ backgroundColor: '#78350f', padding: '20px', borderRadius: '24px', color: 'white', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '120px' }}>
                  <span style={{ fontSize: '10px', fontWeight: '900', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={12}/> GPS</span>
                  <button type="button" onClick={getGPS} style={{ border: 'none', padding: '10px', borderRadius: '12px', fontWeight: '900', fontSize: '10px', backgroundColor: formData.customLocation ? '#fbbf24' : 'white', color: formData.customLocation ? 'white' : '#78350f' }}>{isLocating ? "수신 중..." : formData.customLocation ? "수신 완료" : "위치 잡기"}</button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} id="photo-upload" />
                  <label htmlFor="photo-upload" style={{ width: '100%', height: '120px', borderRadius: '24px', border: '2px dashed #fde68a', background: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
                    {formData.image ? <img src={formData.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <><Camera size={24} color="#fbbf24"/><span style={{ fontSize: '10px', fontWeight: '900', color: '#fbbf24', marginTop: '4px' }}>사진 추가</span></>}
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '900', color: '#92400e' }}>장소 선택</label>
                <select value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} style={{ width: '100%', padding: '16px', borderRadius: '20px', border: '2px solid #fde68a', backgroundColor: 'white', fontSize: '14px', fontWeight: 'bold', color: '#78350f', appearance: 'none' }}>
                  {AREAS.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {TRASH_CATEGORIES.map(c => (
                  <button key={c.id} type="button" onClick={() => setFormData({ ...formData, category: c.id })} style={{ padding: '14px', borderRadius: '20px', border: '2px solid', borderColor: formData.category === c.id ? '#fbbf24' : 'transparent', backgroundColor: 'white', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: '1.2rem' }}>{c.icon}</span><span style={{ fontSize: '11px', fontWeight: '900', color: '#78350f' }}>{c.label}</span>
                  </button>
                ))}
              </div>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="어떤 상황인가요?" style={{ width: '100%', padding: '20px', borderRadius: '24px', border: '2px solid #fde68a', background: 'white', minHeight: '100px', fontSize: '14px', outline: 'none', color: '#78350f' }} />
              <button disabled={isUploading} style={{ backgroundColor: isUploading ? '#d1d5db' : '#fbbf24', color: 'white', border: 'none', padding: '20px', borderRadius: '24px', fontWeight: '900', fontSize: '1.1rem', cursor: isUploading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 15px rgba(251,191,36,0.3)' }}>
                {isUploading ? <><Loader2 className="animate-spin" /> 업로드 중...</> : "지도에 업로드"}
              </button>
            </form>
          </div>
        </div>

        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#fefce8', visibility: activeTab === 'list' ? 'visible' : 'hidden', opacity: activeTab === 'list' ? 1 : 0, transition: 'opacity 0.3s', overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '400px', margin: '0 auto', paddingBottom: '100px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#78350f', marginBottom: '32px' }}>TEAM ARCHIVE</h2>
            {reports.length === 0 ? <div style={{ textAlign: 'center', padding: '40px', color: '#d97706', fontWeight: 'bold', opacity: 0.5 }}>기록이 없습니다.</div> : reports.map(r => (
              <div key={r.id} style={{ backgroundColor: 'white', borderRadius: '32px', padding: '20px', marginBottom: '20px', border: '1px solid #fde68a', boxShadow: '0 4px 15px rgba(146,64,14,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem', background: '#fffbeb', padding: '8px', borderRadius: '12px' }}>{TRASH_CATEGORIES.find(c => c.id === r.category)?.icon}</span>
                    <div><h4 style={{ margin: 0, fontWeight: '900', color: '#78350f' }}>{TRASH_CATEGORIES.find(c => c.id === r.category)?.label}</h4><p style={{ margin: 0, fontSize: '9px', color: '#d97706', opacity: 0.7 }}>{new Date(r.discoveredTime).toLocaleString()}</p></div>
                  </div>
                  <button onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id), { status: r.status === 'pending' ? 'solved' : 'pending' })} style={{ border: 'none', padding: '6px 14px', borderRadius: '12px', fontSize: '9px', fontWeight: '900', background: r.status === 'solved' ? '#fbbf24' : '#fff7ed', color: r.status === 'solved' ? 'white' : '#d97706', cursor: 'pointer' }}>{r.status === 'solved' ? '해결됨 ✓' : '진행중'}</button>
                </div>
                {r.image && <img src={r.image} alt="trash" style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '24px', marginBottom: '16px' }} />}
                <p style={{ margin: 0, padding: '16px', background: '#fffbeb', borderRadius: '18px', fontSize: '13px', color: '#92400e', fontStyle: 'italic', borderLeft: '4px solid #fbbf24' }}>{r.description || "기록 내용이 없습니다."}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #fff7ed' }}>
                  <span style={{ fontSize: '10px', fontWeight: '900', color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px' }}><User size={10}/> {r.userName}</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '10px', fontSize: '9px', fontWeight: '900' }}>{r.area}</span>
                    {(r.userName === nickname || isAdmin) && <button onClick={() => { if(window.confirm("삭제하시겠습니까?")) deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'reports', r.id)); }} style={{ border: 'none', background: 'none', color: '#fca5a5', cursor: 'pointer' }}><Trash2 size={16}/></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#fefce8', visibility: activeTab === 'stats' ? 'visible' : 'hidden', opacity: activeTab === 'stats' ? 1 : 0, transition: 'opacity 0.3s', overflowY: 'auto', padding: '24px' }}>
          <div style={{ maxWidth: '400px', margin: '0 auto', paddingBottom: '100px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#78350f', marginBottom: '32px' }}>TEAM STATS</h2>
            <div style={{ backgroundColor: '#78350f', borderRadius: '32px', padding: '32px', color: 'white', textAlign: 'center', marginBottom: '24px' }}>
               <h3 style={{ fontSize: '3rem', fontWeight: '900', margin: '0 0 8px 0' }}>{reports.filter(r => r.status === 'solved').length}</h3>
               <p style={{ fontSize: '0.8rem', fontWeight: '900', color: '#fbbf24', textTransform: 'uppercase' }}>Cleaned Up!</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '24px', textAlign: 'center', border: '1px solid #fde68a' }}><p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: '#d97706', opacity: 0.5 }}>TOTAL FOUND</p><p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: '900', color: '#78350f' }}>{reports.length}</p></div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '24px', textAlign: 'center', border: '1px solid #fde68a' }}><p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: '#d97706', opacity: 0.5 }}>SUCCESS RATE</p><p style={{ margin: '8px 0 0 0', fontSize: '24px', fontWeight: '900', color: '#fbbf24' }}>{reports.length > 0 ? Math.round((reports.filter(r => r.status === 'solved').length / reports.length) * 100) : 0}%</p></div>
            </div>
            {isAdmin && (
              <div style={{ marginTop: '40px', padding: '32px', background: 'white', borderRadius: '32px', border: '2px dashed #fecaca', textAlign: 'center' }}>
                <h4 style={{ color: '#ef4444', fontWeight: '900', margin: '0 0 10px 0' }}><AlertTriangle size={18}/> ADMIN PANEL</h4>
                <button onClick={clearAllData} style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '16px', borderRadius: '16px', fontWeight: '900', cursor: 'pointer' }}>데이터 전체 삭제</button>
              </div>
            )}
          </div>
        </div>
      </main>

      <nav style={{ height: '80px', backgroundColor: 'white', borderTop: '1px solid #fde68a', display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingBottom: '15px' }}>
        <button onClick={() => setActiveTab('map')} style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <MapPin size={24} color={activeTab === 'map' ? '#fbbf24' : '#d97706'} fill={activeTab === 'map' ? '#fbbf24' : 'none'} strokeWidth={3}/>
          <span style={{ fontSize: '9px', fontWeight: '900', color: activeTab === 'map' ? '#fbbf24' : '#d97706' }}>MAP</span>
        </button>
        <button onClick={() => setActiveTab('list')} style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <List size={24} color={activeTab === 'list' ? '#fbbf24' : '#d97706'} strokeWidth={3}/>
          <span style={{ fontSize: '9px', fontWeight: '900', color: activeTab === 'list' ? '#fbbf24' : '#d97706' }}>FEED</span>
        </button>
        <button onClick={() => setActiveTab('stats')} style={{ border: 'none', background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <BarChart3 size={24} color={activeTab === 'stats' ? '#fbbf24' : '#d97706'} strokeWidth={3}/>
          <span style={{ fontSize: '9px', fontWeight: '900', color: activeTab === 'stats' ? '#fbbf24' : '#d97706' }}>STATS</span>
        </button>
      </nav>

      <style>{`
        body, html { margin: 0; padding: 0; background-color: #fefce8 !important; }
        .leaflet-container { z-index: 1 !important; background: #fefce8 !important; }
        .custom-pin { background: none !important; border: none !important; }
        ::-webkit-scrollbar { width: 0px; background: transparent; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}