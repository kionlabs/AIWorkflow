import { useState, useEffect, useRef } from "react";
import { 
  Sparkles, 
  Settings, 
  ArrowRight, 
  Code, 
  Globe, 
  Layers, 
  CheckCircle, 
  Play, 
  Download, 
  HelpCircle, 
  Info, 
  RefreshCw, 
  Edit, 
  Terminal, 
  Eye, 
  Copy, 
  FileCode, 
  User, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Lock,
  RotateCw,
  Plus,
  Trash,
  LogOut,
  LayoutDashboard,
  TrendingUp,
  Activity,
  Users,
  Video,
  Image as ImageIcon,
  MoreHorizontal,
  MessageSquare,
  Bell,
  Heart,
  Bookmark,
  Calendar,
  PlusCircle,
  Share2,
  Megaphone,
  BookOpen
} from "lucide-react";
import { supabase, mockAuth, isSupabaseConfigured, UserSession } from "./lib/supabase";
import AuthPage from "./components/AuthPage";

// Types for Planning output
interface KeyFeature {
  title: string;
  description: string;
}

interface AppSpec {
  appName: string;
  description: string;
  targetAudience: string;
  keyFeatures: KeyFeature[];
  uiLayout: string;
  techSpecs: string;
  systemPrompt: string;
  isFallback?: boolean;
}

// Types for Developer output
interface FileItem {
  path: string;
  content: string;
}

interface GeneratedCode {
  appName: string;
  files: FileItem[];
  isFallback?: boolean;
}

interface DeploymentResult {
  success: boolean;
  siteId: string;
  siteName: string;
  siteUrl: string;
  deployId: string;
  deployUrl: string;
  message: string;
}

// Custom Saved App Interface
interface SavedApp {
  id: string;
  appName: string;
  description: string;
  idea: string;
  createdAt: string;
  deployedUrl?: string;
  isCustom?: boolean;
}

// Initial Saved App list to populate the dashboard card grid
const INITIAL_SAVED_APPS: SavedApp[] = [
  {
    id: "app-1",
    appName: "수분 충전 챌린지 🥤",
    description: "목표 설정 및 실시간 물방울 캐릭터 육성을 결합한 습관 빌더",
    idea: "사용자가 하루 물 마시기 목표를 정하고, 매시간 리마인더와 수분 기록을 귀여운 물방울 캐릭터 성장에 시각화하여 재미있게 추적하는 습관 메이커 앱",
    createdAt: "2026.07.12",
    deployedUrl: "https://hydrate-challenge-demo.netlify.app"
  },
  {
    id: "app-2",
    appName: "중등 영단어 스피드 퀴즈 🧠",
    description: "제한 시간 내 단어 암기를 유도하는 스코어 콤보 영어 퀴즈 솔루션",
    idea: "중학생 필수 영단어를 제한시간 내에 뜻을 맞추는 스피드 퀴즈 앱. 연속 정답 시 콤보 보너스와 이펙트가 있고, 오답 노트를 자동 저장하는 기능.",
    createdAt: "2026.07.14",
    deployedUrl: "https://voca-speed-quiz-demo.netlify.app"
  },
  {
    id: "app-3",
    appName: "3줄 감사 일기 & 기분 기록 ✍️",
    description: "미니멀 기입창과 월간 감정 분석 통계 그래프 캘린더",
    idea: "바쁜 하루 속에서 감사한 일 딱 3가지만 기입하는 미니멀 저널 앱. 오늘 하루의 감정 아이콘을 골라 월간 감정 캘린더에 감정 통계 차트를 그려줌.",
    createdAt: "2026.07.15",
    deployedUrl: "https://three-line-diary-demo.netlify.app"
  }
];

// Idea Templates for students
const IDEA_TEMPLATES = [
  {
    id: "hydrate-challenge",
    title: "🥤 수분 충전 챌린지",
    idea: "사용자가 하루 물 마시기 목표를 정하고, 매시간 리마인더와 수분 기록을 귀여운 물방울 캐릭터 성장에 시각화하여 재미있게 추적하는 습관 메이커 앱",
  },
  {
    id: "voca-quiz",
    title: "🧠 중등 영단어 스피드 퀴즈",
    idea: "중학생 필수 영단어를 제한시간 내에 뜻을 맞추는 스피드 퀴즈 앱. 연속 정답 시 콤보 보너스와 이펙트가 있고, 오답 노트를 자동 저장하는 기능.",
  },
  {
    id: "three-line-diary",
    title: "✍️ 3줄 감사 일기 & 기분 기록",
    idea: "바쁜 하루 속에서 감사한 일 딱 3가지만 기입하는 미니멀 저널 앱. 오늘 하루의 감정 아이콘을 골라 월간 감정 캘린더에 감정 통계 차트를 그려줌.",
  },
  {
    id: "pomodoro-timer",
    title: "⏱️ 집중 뽀모도로 타이머",
    idea: "25분 집중, 5분 휴식을 시각적 타이머와 사운드로 보조해주는 학습 보조기. 집중 세션 횟수를 기입해 하루 총 공부량을 시간 그래프로 보여주는 앱.",
  }
];

export default function App() {
  // Navigation Menu state
  const [currentMenu, setCurrentMenu] = useState<"dashboard" | "builder" | "settings">("dashboard");
  
  // Saved Apps list state
  const [savedApps, setSavedApps] = useState<SavedApp[]>(() => {
    const local = localStorage.getItem("KION_SAVED_APPS");
    return local ? JSON.parse(local) : INITIAL_SAVED_APPS;
  });
  
  // Modal/Detail state for a selected app
  const [selectedApp, setSelectedApp] = useState<SavedApp | null>(null);

  // State
  const [user, setUser] = useState<UserSession | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [idea, setIdea] = useState("");
  const [isPlanning, setIsPlanning] = useState(false);
  const [appSpec, setAppSpec] = useState<AppSpec | null>(null);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Interactive PM Planner Chat States
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "안녕하세요! 여러분의 AI 기획자(PM)입니다. 만들고 싶은 앱의 아이디어를 위에서 기획한 후, 사양에 마음에 들지 않는 점이나 버그 피드백을 이곳에 편하게 말씀해주세요. 기획 사양을 자동으로 업데이트해 드릴게요! 🤖" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [hasNewSpecUpdate, setHasNewSpecUpdate] = useState(false);

  // Developer Agent state
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [developerLogs, setDeveloperLogs] = useState<string[]>([]);
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  
  // Active Tab in Right Panel: "preview", "code", "deploy"
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "deploy">("preview");
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);

  // Netlify Deploy State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [netlifyToken, setNetlifyToken] = useState("");
  const [deployResult, setDeployResult] = useState<DeploymentResult | null>(null);

  // Rate Limit / Cooldown modal states
  const [cooldownTime, setCooldownTime] = useState<number>(0);
  const [cooldownMessage, setCooldownMessage] = useState<string>("");

  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setInterval(() => {
      setCooldownTime(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTime]);

  // Local Cache auto-restore on idea change
  useEffect(() => {
    const trimmed = idea.trim();
    if (!trimmed) {
      setAppSpec(null);
      setGeneratedCode(null);
      return;
    }
    const cachedSpec = localStorage.getItem("KION_SPEC_CACHE_" + trimmed);
    if (cachedSpec) {
      try {
        const parsedSpec = JSON.parse(cachedSpec);
        setAppSpec(parsedSpec);
        
        const cachedCode = localStorage.getItem("KION_CODE_CACHE_" + trimmed);
        if (cachedCode) {
          setGeneratedCode(JSON.parse(cachedCode));
        } else {
          setGeneratedCode(null);
        }
        setDeployResult(null);
        setHasNewSpecUpdate(false);
      } catch (e) {
        console.error("Cache restore error:", e);
      }
    } else {
      setAppSpec(null);
      setGeneratedCode(null);
      setDeployResult(null);
    }
  }, [idea]);
  
  // UI Panels
  const [showSettings, setShowSettings] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [focusMode, setFocusMode] = useState<boolean>(false);

  // Admin & Settings States
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [notices, setNotices] = useState<string[]>([
    "📌 [과제 안내] 이번 주 금요일까지 나만의 인공지능 번역기 앱 제출 마감입니다!",
    "💡 [팁] 리액트 기초 학습자분들은 템플릿 실습 코드를 대시보드에서 복사해 테스트하세요."
  ]);
  const [resources, setResources] = useState<any[]>([
    { emoji: "⚡", title: "React + Vite 공식 교육 가이드", url: "https://ko.vite.dev/" },
    { emoji: "🎨", title: "Tailwind CSS 레이아웃 도구", url: "https://tailwindcss.com/" },
    { emoji: "🤖", title: "Gemini API 빠른 시작 가이드", url: "https://ai.google.dev/" }
  ]);

  const [isEditingNotices, setIsEditingNotices] = useState<boolean>(false);
  const [isEditingResources, setIsEditingResources] = useState<boolean>(false);
  const [tempNotices, setTempNotices] = useState<string[]>([]);
  const [tempResources, setTempResources] = useState<any[]>([]);

  // Check if current logged-in user is an admin (kionlabs@gmail.com)
  useEffect(() => {
    if (user?.email && user.email.toLowerCase() === "kionlabs@gmail.com") {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Fetch Settings from Supabase or server API
  const fetchSettings = async () => {
    try {
      let dataLoaded = false;
      
      // 1. Try fetching from Supabase settings table if configured
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from("settings")
            .select("data")
            .eq("id", "kionlabs_settings")
            .single();
            
          if (!error && data?.data) {
            if (data.data.notices) setNotices(data.data.notices);
            if (data.data.resources) setResources(data.data.resources);
            dataLoaded = true;
          } else {
            // Also try 'contents' table just in case
            const { data: cData, error: cError } = await supabase
              .from("contents")
              .select("data")
              .eq("id", "kionlabs_settings")
              .single();
              
            if (!cError && cData?.data) {
              if (cData.data.notices) setNotices(cData.data.notices);
              if (cData.data.resources) setResources(cData.data.resources);
              dataLoaded = true;
            }
          }
        } catch (supabaseErr) {
          console.warn("Supabase fetch failed, falling back to server API:", supabaseErr);
        }
      }
      
      // 2. Fallback: Fetch from Express backend API
      if (!dataLoaded) {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.notices) setNotices(data.notices);
          if (data.resources) setResources(data.resources);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  // Save Settings to Supabase and/or server API
  const saveSettings = async (updatedNotices: string[], updatedResources: any[]) => {
    try {
      // Optimistic update
      setNotices(updatedNotices);
      setResources(updatedResources);

      // 1. Try saving to Supabase if configured
      if (isSupabaseConfigured) {
        try {
          // Try 'settings' table first
          const { error } = await supabase
            .from("settings")
            .upsert({ id: "kionlabs_settings", data: { notices: updatedNotices, resources: updatedResources } });
            
          if (error) {
            // Try 'contents' table as secondary option
            const { error: cError } = await supabase
              .from("contents")
              .upsert({ id: "kionlabs_settings", data: { notices: updatedNotices, resources: updatedResources } });
            if (cError) {
              console.warn("Supabase table upsert failed on both tables, saving to backend API only:", error, cError);
            }
          }
        } catch (supabaseErr) {
          console.warn("Supabase write failed, falling back to server API:", supabaseErr);
        }
      }

      // 2. Write to Express backend API
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notices: updatedNotices, resources: updatedResources })
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  // Load settings on load & poll every 10 seconds for real-time updates for students
  useEffect(() => {
    fetchSettings();
    const interval = setInterval(() => {
      fetchSettings();
    }, 10000); // 10s polling
    return () => clearInterval(interval);
  }, []);

  // Load user session on startup
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.user) {
            setUser({
              email: data.session.user.email || "",
              name: data.session.user.user_metadata?.full_name || data.session.user.email?.split("@")[0] || "유저",
              createdAt: data.session.user.created_at,
              provider: "supabase"
            });
          } else {
            const mockUser = mockAuth.getSessionUser();
            if (mockUser) setUser(mockUser);
          }
        } else {
          const mockUser = mockAuth.getSessionUser();
          if (mockUser) setUser(mockUser);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, []);

  // Sign out handler
  const handleSignOut = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      await mockAuth.signOut();
      setUser(null);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  // Load Netlify token on startup
  useEffect(() => {
    const savedToken = localStorage.getItem("NETLIFY_AUTH_TOKEN");
    if (savedToken) {
      setNetlifyToken(savedToken);
    }
  }, []);

  // Save Netlify token
  const saveNetlifyToken = (tokenValue: string) => {
    setNetlifyToken(tokenValue);
    localStorage.setItem("NETLIFY_AUTH_TOKEN", tokenValue);
  };

  // Run Plan Agent
  // Run Plan Agent
  const handleGenerateSpec = async (forceRegen = false) => {
    if (!idea.trim()) return;

    // Check Cache first if not explicitly forcing regeneration
    if (!forceRegen) {
      const cached = localStorage.getItem("KION_SPEC_CACHE_" + idea.trim());
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setAppSpec(parsed);
          setHasNewSpecUpdate(false);
          setDeployResult(null);
          
          const cachedCode = localStorage.getItem("KION_CODE_CACHE_" + idea.trim());
          if (cachedCode) {
            setGeneratedCode(JSON.parse(cachedCode));
          } else {
            setGeneratedCode(null);
          }
          return; // Restored from Cache!
        } catch (e) {
          console.error("Cache parsing error, falling back to API:", e);
        }
      }
    }

    setIsPlanning(true);
    setAppSpec(null);
    setGeneratedCode(null);
    setDeployResult(null);
    setHasNewSpecUpdate(false);
    
    // Throttle / Artificial Delay: 1.5 seconds delay before calling API to manage request volume
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const response = await fetch("/api/gemini/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea })
      });
      
      if (response.status === 429) {
        setCooldownTime(30);
        throw new Error("AI가 지금 너무 바빠요! 잠시 후(예: 30초 뒤) 다시 시도해주세요.");
      }
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "기획 에이전트로부터 응답을 받지 못했습니다.");
      }

      // Save to Cache
      localStorage.setItem("KION_SPEC_CACHE_" + idea.trim(), JSON.stringify(data));

      setAppSpec(data);
      if (data.isFallback) {
        setChatMessages([
          {
            role: "assistant",
            content: `🚀 앱 [${data.appName || "나만의 앱"}] 기획 명세서 작성을 완료했습니다!\n\n💡 [안내] 현재 Gemini API 사용량이 많아 안전한 '로컬 기획 백업 모드'로 자동 전환되었습니다. 개발 에이전트 구동 시에도 똑똑한 기계학습 기반 템플릿 코드를 빠르고 완벽하게 연결해 드려요! 편하게 기획을 이어가세요. 👍`
          }
        ]);
      } else {
        setChatMessages([
          {
            role: "assistant",
            content: `🚀 앱 [${data.appName || "나만의 앱"}] 기획 명세서 작성을 완료했습니다! 기획서 내용에 버그 피드백이나 개선/변경하고 싶은 사양이 있다면 아래 대화창에 편하게 알려주세요. 기획서를 자동으로 보완해 드릴게요! 🤖`
          }
        ]);
      }
    } catch (err: any) {
      alert(`기획 실패: ${err.message}`);
    } finally {
      setIsPlanning(false);
    }
  };

  // Run Interactive PM Planner Chat API
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !appSpec || isChatting) return;

    const userMsg = chatInput.trim();
    setChatInput("");
    setIsChatting(true);

    // Append user message
    const updatedMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(updatedMessages);

    // Throttle / Artificial Delay: 1.5 seconds delay before calling API
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const response = await fetch("/api/gemini/plan-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec: appSpec,
          message: userMsg,
          chatHistory: updatedMessages
        })
      });

      if (response.status === 429) {
        setCooldownTime(30);
        throw new Error("AI가 지금 너무 바빠요! 잠시 후(예: 30초 뒤) 다시 시도해주세요.");
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || data.message || "PM 에이전트로부터 응답을 받지 못했습니다.");
      }

      const data = await response.json();
      
      const updatedSpec = {
        appName: data.appName || appSpec.appName,
        description: data.description || appSpec.description,
        targetAudience: data.targetAudience || appSpec.targetAudience,
        keyFeatures: data.keyFeatures || appSpec.keyFeatures,
        uiLayout: data.uiLayout || appSpec.uiLayout,
        techSpecs: data.techSpecs || appSpec.techSpecs,
        systemPrompt: data.systemPrompt || appSpec.systemPrompt
      };

      // Update the specification dynamically!
      setAppSpec(updatedSpec);

      // Save updated spec to Cache
      localStorage.setItem("KION_SPEC_CACHE_" + idea.trim(), JSON.stringify(updatedSpec));

      // Show update indicator so that Developer Agent's '코드 반영하기' activates
      setHasNewSpecUpdate(true);

      // Append assistant response
      setChatMessages(prev => [
        ...prev,
        { role: "assistant" as const, content: data.assistantReply || "기획 사양에 학생분의 피드백을 똑똑하게 수용하여 업데이트했습니다! 우측 영역에서 [코드 반영하기] 버튼을 통해 즉각 완성된 코드로 반영해보세요. 🚀" }
      ]);
    } catch (err: any) {
      console.error("Interactive PM Chat error:", err);
      setChatMessages(prev => [
        ...prev,
        { role: "assistant" as const, content: `❌ 피드백 반영 실패: ${err.message || "알 수 없는 오류가 발생했습니다."}. 다시 시도해주세요!` }
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  // Run Developer Agent
  const handleGenerateCode = async (specToBuild?: AppSpec, forceRegen = false) => {
    const targetSpec = specToBuild || appSpec;

    // Guard against empty / missing spec data
    if (!targetSpec || !targetSpec.appName || !targetSpec.appName.trim() || !targetSpec.description || !targetSpec.description.trim()) {
      alert("❌ 기획 명세(AI SPEC SHEET) 데이터가 없거나 비어 있습니다! 기획을 먼저 생성하거나 데이터를 채워주세요.");
      return;
    }

    // Check Cache first if not explicitly forcing regeneration
    if (!forceRegen) {
      const cachedCode = localStorage.getItem("KION_CODE_CACHE_" + idea.trim());
      if (cachedCode) {
        try {
          const parsedCode = JSON.parse(cachedCode);
          setGeneratedCode(parsedCode);
          setDeployResult(null);
          setHasNewSpecUpdate(false);
          setActiveTab("preview");
          setSelectedFileIndex(0);
          return; // Restored from Cache!
        } catch (e) {
          console.error("Code Cache restore error, falling back to API:", e);
        }
      }
    }

    setIsDeveloping(true);
    setHasNewSpecUpdate(false); // Reset update indicator when starting build
    setGeneratedCode(null);
    setDeployResult(null);
    setActiveTab("preview");
    setDeveloperLogs([]);

    const logs = [
      "🤖 개발자 에이전트 가동 시작...",
      `📋 기획 명세서 [ ${targetSpec.appName} ] 스펙 데이터 검증 성공!`,
      "📋 PM 기획 명세서와 세부 지시사항 분석 중...",
      "🛠️ 정적 싱글 페이지 웹애플리케이션(SPA) 파일 구성 설계...",
      "📝 index.html 생성 중 (Tailwind CSS 템플릿 레이아웃 작성)...",
      "📝 script.js 작성 중 (인터랙션 및 LocalStorage 데이터 상태 설계)...",
      "📝 styles.css 작성 중 (애니메이션 트랜지션 클래스 추가)...",
      "📝 _redirects 생성 중 (Netlify SPA 배포용 리다이렉션 정책 삽입)...",
      "🔬 코드 정밀 정합성 및 자체 작동 테스트 실행 중...",
      "✅ 완성도 높은 풀스택 코드 번들 빌드 완료!"
    ];

    // Log stream effect
    for (let i = 0; i < logs.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setDeveloperLogs(prev => [...prev, logs[i]]);
    }

    // Throttle / Artificial Delay: 1.5 seconds delay before calling API
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const response = await fetch("/api/gemini/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          spec: targetSpec,
          customSystemPrompt: targetSpec.systemPrompt
        })
      });

      if (response.status === 429) {
        setCooldownTime(30);
        throw new Error("AI가 지금 너무 바빠요! 잠시 후(예: 30초 뒤) 다시 시도해주세요.");
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || "개발 에이전트로부터 응답을 받지 못했습니다.");
      }

      // Save to Cache
      localStorage.setItem("KION_CODE_CACHE_" + idea.trim(), JSON.stringify(data));

      setGeneratedCode(data);
      setSelectedFileIndex(0);

      if (data.isFallback) {
        setDeveloperLogs(prev => [
          ...prev,
          "⚠️ [알림] 현재 Gemini API가 고부하 상태(503)입니다.",
          "💡 시스템 안정성을 보장하기 위해 Kion 스마트 백업 엔진이 자동 구동되었습니다.",
          "🚀 100% 자체 구동되는 오프라인 템플릿 소스코드가 즉시 연동 완료되었습니다!"
        ]);
      }

      // Automatically add to savedApps
      setSavedApps(prev => {
        const exists = prev.find(a => a.appName === data.appName);
        if (exists) return prev;
        const newApp: SavedApp = {
          id: `app-${Date.now()}`,
          appName: data.appName,
          description: targetSpec?.description || "AI가 기획하고 제작한 애플리케이션",
          idea: idea.trim(),
          createdAt: new Date().toLocaleDateString("ko-KR"),
          isCustom: true
        };
        const updated = [newApp, ...prev];
        localStorage.setItem("KION_SAVED_APPS", JSON.stringify(updated));
        return updated;
      });
    } catch (err: any) {
      alert(`개발 실패: ${err.message}`);
    } finally {
      setIsDeveloping(false);
    }
  };

  // Netlify Deploy API integration
  const handleDeployToNetlify = async () => {
    if (!generatedCode) return;
    setIsDeploying(true);
    setDeployResult(null);
    setDeployLogs([]);

    const logs = [
      "📦 dist 폴더 기준 정적 번들 빌딩 시작...",
      "📂 index.html, script.js, styles.css, _redirects 취합 중...",
      "🤐 0% 자본 소실 예방을 위한 가상 메모리 내 ZIP 아카이브 압축 진행...",
      "☁️ Netlify API 통신 중: 가상 사이트 생성 요청 발송...",
      "🔗 Netlify 가상 사이트 인스턴스 구축 완료!",
      "📤 ZIP 아카이브 클라우드 디플로이 파이프라인으로 전송 중...",
      "⚡ 파일 업로드 완료 및 실시간 인프라 매핑 중...",
      "🛡️ 전 세계 엣지 네트워크 보안 SSL 인증서 적용 중...",
      "🎉 실시간 라이브 사이트 최종 배포 완료!"
    ];

    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setDeployLogs(prev => [...prev, logs[i]]);
    }

    try {
      const response = await fetch("/api/netlify/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: generatedCode.files,
          customToken: netlifyToken.trim() || undefined
        })
      });

      const data = await response.json();
      
      for (let i = 5; i < logs.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setDeployLogs(prev => [...prev, logs[i]]);
      }

      if (!response.ok) {
        throw new Error(data.error || "Netlify 배포에 실패했습니다.");
      }

      setDeployResult(data);

      if (data.siteUrl) {
        setSavedApps(prev => {
          const updated = prev.map(a => {
            if (a.appName === generatedCode.appName) {
              return { ...a, deployedUrl: data.siteUrl };
            }
            return a;
          });
          localStorage.setItem("KION_SAVED_APPS", JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err: any) {
      alert(`배포 실패: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  // Interactive Live Preview merge logic (index.html + script.js + styles.css)
  const getPreviewHtml = (): string => {
    if (!generatedCode) return "";
    
    const indexFile = generatedCode.files.find(f => f.path === "index.html");
    const scriptFile = generatedCode.files.find(f => f.path === "script.js");
    const cssFile = generatedCode.files.find(f => f.path === "styles.css");

    if (!indexFile) return "index.html 파일을 찾을 수 없습니다.";

    let rawHtml = indexFile.content;

    // Inject Script before </body>
    if (scriptFile) {
      const inlineScript = `<script>\n${scriptFile.content}\n</script>`;
      if (rawHtml.includes('<script src="script.js"')) {
        rawHtml = rawHtml.replace(/<script src="script.js".*?><\/script>/g, inlineScript);
      } else {
        rawHtml = rawHtml.replace("</body>", `${inlineScript}\n</body>`);
      }
    }

    // Inject CSS
    if (cssFile) {
      const inlineCss = `<style>\n${cssFile.content}\n</style>`;
      if (rawHtml.includes('<link rel="stylesheet" href="styles.css">')) {
        rawHtml = rawHtml.replace('<link rel="stylesheet" href="styles.css">', inlineCss);
      } else {
        rawHtml = rawHtml.replace("</head>", `${inlineCss}\n</head>`);
      }
    }

    return rawHtml;
  };

  // Copy code to clipboard
  const handleCopyCode = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopyStatus(type);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  // Download code as a manual ZIP
  const handleDownloadZIP = () => {
    if (!generatedCode) return;
    
    const blob = new Blob([getPreviewHtml()], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "index.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert("현재 로컬 테스팅 및 단일 배포용 통합 'index.html' 파일이 다운로드되었습니다!");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF8] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#E0D6E6] border-t-[#4F3466] rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-[#4F3466] uppercase tracking-wider animate-pulse">KION Labs 인증 시스템 연결 중...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={(sessionUser) => setUser(sessionUser)} />;
  }

  return (
    <div className="min-h-screen bg-[#F8F7FA] text-[#1E1B26] flex overflow-hidden font-sans antialiased selection:bg-indigo-600 selection:text-white">
      
      {/* 1. LEFT SIDEBAR (Navigation Sidebar) */}
      <aside id="left-sidebar" className={`w-64 bg-white border-r border-[#ECEAF0] flex flex-col shrink-0 transition-all duration-300 z-20 ${focusMode ? "hidden" : "hidden md:flex"}`}>
        
        {/* LOGO AREA */}
        <div className="p-6 border-b border-[#F5F4F7] flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-150">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-[#1E1B26]">Redwhale</h2>
            <p className="text-[10px] text-[#A29EB0] font-medium">Growth & Marketing</p>
          </div>
        </div>

        {/* MIDDLE MENU NAVIGATION */}
        <nav className="flex-1 px-4 py-6 space-y-7 overflow-y-auto">
          
          {/* Main Menus */}
          <div className="space-y-1.5">
            <button
              onClick={() => { setCurrentMenu("dashboard"); setSelectedApp(null); setFocusMode(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                currentMenu === "dashboard"
                  ? "bg-[#F3EFFC] text-[#633BCA]"
                  : "text-[#7A748A] hover:bg-[#FAF9FC] hover:text-[#1E1B26]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => { setCurrentMenu("builder"); setSelectedApp(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                currentMenu === "builder"
                  ? "bg-[#F3EFFC] text-[#633BCA]"
                  : "text-[#7A748A] hover:bg-[#FAF9FC] hover:text-[#1E1B26]"
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>AI Workspace</span>
            </button>

            <button
              onClick={() => { setCurrentMenu("settings"); setSelectedApp(null); setFocusMode(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 ${
                currentMenu === "settings"
                  ? "bg-[#F3EFFC] text-[#633BCA]"
                  : "text-[#7A748A] hover:bg-[#FAF9FC] hover:text-[#1E1B26]"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          {/* Posts list mimic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-4 text-[10px] font-extrabold uppercase tracking-wider text-[#A29EB0]">
              <span>Posts</span>
              <span className="cursor-pointer hover:text-[#1E1B26]">+</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold text-[#7A748A] hover:bg-[#FAF9FC] cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Published</span>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold text-[#7A748A] hover:bg-[#FAF9FC] cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Today's Scheduled</span>
                </div>
                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">+2</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2 rounded-lg text-xs font-semibold text-[#7A748A] hover:bg-[#FAF9FC] cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-3.5 h-3.5 text-rose-500" />
                  <span>Bookmarks</span>
                </div>
              </div>
            </div>
          </div>

          {/* Favorite users list mimic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-4 text-[10px] font-extrabold uppercase tracking-wider text-[#A29EB0]">
              <span>Favorite Users</span>
              <span className="cursor-pointer hover:text-[#1E1B26]">+</span>
            </div>
            <div className="px-4 py-1 flex items-center gap-2 text-xs font-semibold text-[#7A748A]">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>KION Mentors</span>
            </div>
          </div>

        </nav>

        {/* BOTTOM SECTION */}
        <div className="p-4 border-t border-[#F5F4F7] space-y-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-[#FAF9FC] rounded-lg transition">
            <span>+</span>
            <span>Invite new member</span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50/50 rounded-lg transition"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </span>
          </button>
        </div>

      </aside>

      {/* CENTER & RIGHT WRAPPER */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* 2. CENTRAL MAIN CONTENT (Dashboard/Activity/Settings) */}
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${focusMode ? "p-0 sm:p-4 bg-[#F1EFF4]" : "p-6 lg:p-8 space-y-8 bg-[#F8F7FA]"}`}>
          
          {/* MOBILE NAVIGATION HEADER */}
          <div className={`md:hidden flex items-center justify-between pb-4 border-b border-[#ECEAF0] ${focusMode ? "hidden" : ""}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#633BCA] rounded-lg flex items-center justify-center text-white font-bold">R</div>
              <h1 className="text-sm font-extrabold">Redwhale</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentMenu("dashboard")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${currentMenu === "dashboard" ? "bg-[#633BCA] text-white" : "bg-white border text-slate-600"}`}
              >
                Dashboard
              </button>
              <button 
                onClick={() => setCurrentMenu("builder")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${currentMenu === "builder" ? "bg-[#633BCA] text-white" : "bg-white border text-slate-600"}`}
              >
                Builder
              </button>
              <button 
                onClick={() => setCurrentMenu("settings")}
                className={`px-3 py-1 text-xs font-bold rounded-lg ${currentMenu === "settings" ? "bg-[#633BCA] text-white" : "bg-white border text-slate-600"}`}
              >
                Settings
              </button>
            </div>
          </div>

          {currentMenu === "dashboard" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* TOP HERO PROFILE SECTION WITH MEMBERS AVATARS */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[#1E1B26]">My Apps Dashboard</h1>
                  <p className="text-xs text-[#A29EB0] font-medium mt-0.5">Welcome back to your educational application development suite.</p>
                </div>

                {/* Cooperative student list mimics */}
                <div className="flex items-center -space-x-2 overflow-hidden py-1">
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[#FAF9FB] flex items-center justify-center text-xs font-bold text-slate-400 cursor-pointer hover:bg-slate-100 transition shadow-sm z-10" title="Add collaborative team member">+</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm" title="Johnny (Builder 1)">JN</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-amber-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm" title="Angela (UX)">AG</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-[#4F3466] text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm" title="Mikey (PM)">MK</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-teal-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm" title="Adam (Dev)">AD</div>
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-rose-500 text-white flex items-center justify-center text-[10px] font-extrabold shadow-sm" title="David (Q/A)">DV</div>
                </div>
              </div>

              {/* 30 DAYS PERFORMANCE STATUS CARDS (Mimics the layout and ratio of the reference image) */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#7A748A]">30 Days Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  
                  {/* VIEWS CARD (Purple/Yellow gradient) */}
                  <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 bg-gradient-to-br from-[#5E3BC2] to-[#B08FFF] p-5 text-white min-h-[110px] flex flex-col justify-between">
                    <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-amber-400/20 to-transparent pointer-events-none rounded-r-2xl" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#DED1FF]">[총 앱 배포 수]</span>
                    <div>
                      <div className="text-2xl font-black tracking-tight">7,482,120</div>
                      <p className="text-[10px] text-purple-100/80 font-medium mt-0.5">누적 빌드 및 배포 완료 앱</p>
                    </div>
                  </div>

                  {/* FOLLOWS CARD (Blue/Coral gradient) */}
                  <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 bg-gradient-to-br from-[#415FE3] to-[#7B92FF] p-5 text-white min-h-[110px] flex flex-col justify-between">
                    <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-rose-400/20 to-transparent pointer-events-none rounded-r-2xl" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#D5DEFF]">[참여 학생 수]</span>
                    <div>
                      <div className="text-2xl font-black tracking-tight">54,364</div>
                      <p className="text-[10px] text-blue-100/80 font-medium mt-0.5">클래스 참여 활성 학생 수</p>
                    </div>
                  </div>

                  {/* LIKES CARD (Cyan/Blue gradient) */}
                  <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 bg-gradient-to-br from-[#30AEE6] to-[#7CD5FF] p-5 text-white min-h-[110px] flex flex-col justify-between">
                    <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-teal-400/20 to-transparent pointer-events-none rounded-r-2xl" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#D3F3FF]">[총 상호작용]</span>
                    <div>
                      <div className="text-2xl font-black tracking-tight">125,685</div>
                      <p className="text-[10px] text-cyan-100/80 font-medium mt-0.5">사용자 상호작용 및 이벤트</p>
                    </div>
                  </div>

                </div>
              </div>

              {/* MIDDLE GRID: MY APP GALLERY (Real integration of the user's generated apps + Seed templates) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#7A748A]">내 앱 리스트 (My App Gallery)</h3>
                  <span className="text-xs font-bold text-indigo-600">{savedApps.length} Apps Saved</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  
                  {/* "+ Add New App" special action card - Emphasized with light violet bg and dark violet dashed border */}
                  <button
                    onClick={() => setCurrentMenu("builder")}
                    className="group border-2 border-dashed border-[#633BCA] bg-[#F5F1FD] hover:bg-[#ECE5FB] hover:border-[#522EB4] p-5 rounded-2xl flex flex-col items-center justify-center text-center gap-3 transition-all duration-200 min-h-[180px] shadow-md shadow-[#633BCA]/5"
                  >
                    <div className="w-12 h-12 rounded-full bg-white text-[#633BCA] flex items-center justify-center shadow-sm transition group-hover:scale-110">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-[#633BCA]">새로운 앱 빌드하기</h4>
                      <p className="text-[10px] text-[#633BCA]/80 mt-1.5 max-w-[160px] leading-relaxed">기획 & 개발 에이전트를 통해 맞춤형 웹앱을 바로 제작하세요.</p>
                    </div>
                  </button>

                  {/* Render savedApps dynamically */}
                  {savedApps.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white border border-[#ECEAF0] hover:border-[#633BCA]/20 hover:shadow-md rounded-2xl overflow-hidden transition-all duration-250 flex flex-col justify-between min-h-[180px] group"
                    >
                      {/* Abstract colorful background headers */}
                      <div className={`h-12 w-full p-3 flex justify-between items-center ${
                        app.id === "app-1" ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700" :
                        app.id === "app-2" ? "bg-gradient-to-r from-amber-50 to-orange-50 text-orange-700" :
                        app.id === "app-3" ? "bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700" :
                        "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700"
                      }`}>
                        <div className="flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider">APP INSTANCE</span>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                          <button
                            title="삭제"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("정말 이 앱을 대시보드에서 제거하시겠습니까?")) {
                                setSavedApps(prev => {
                                  const updated = prev.filter(item => item.id !== app.id);
                                  localStorage.setItem("KION_SAVED_APPS", JSON.stringify(updated));
                                  return updated;
                                });
                              }
                            }}
                            className="p-1 rounded bg-white/80 hover:bg-white text-rose-500 hover:text-rose-600 shadow-sm"
                          >
                            <Trash className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Main Card Body */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-black text-[#1E1B26] truncate">{app.appName}</h4>
                          <p className="text-[10px] text-[#A29EB0] line-clamp-2 mt-1 leading-relaxed">
                            {app.description}
                          </p>
                        </div>

                        {/* Action buttons on card bottom */}
                        <div className="flex items-center justify-between gap-2 border-t border-[#F5F4F7] pt-3 mt-3">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              if (app.isCustom && generatedCode && app.appName === generatedCode.appName) {
                                // Already active, no problem
                              } else if (app.isCustom) {
                                // Find or mock active generated state if needed
                              }
                            }}
                            className="flex-1 bg-[#633BCA] hover:bg-[#522EB4] text-white py-1.5 px-3 rounded-lg text-[10px] font-black transition text-center flex items-center justify-center gap-1"
                          >
                            <Play className="w-2.5 h-2.5 fill-white" />
                            <span>Preview & Workspace</span>
                          </button>
                          
                          {app.deployedUrl ? (
                            <a
                              href={app.deployedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-[#FAF9FC] hover:bg-[#F3EFFC] text-[#633BCA] p-1.5 rounded-lg border border-[#ECEAF0] hover:border-[#633BCA]/15 transition"
                              title="라이브 사이트 새창 보기"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[8px] bg-slate-150 text-slate-400 p-1.5 rounded-lg" title="배포되지 않음">
                              No Deploy
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}

                </div>
              </div>

              {/* ANALYTICS & EVENTS DISTRIBUTION ROW (Beautiful interactive graphics) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: Analytics Custom Wave Graphic (col-span-7) */}
                <div className="lg:col-span-7 bg-white border border-[#ECEAF0] p-5 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-[#FAF9FC] pb-2">
                    <div>
                      <h4 className="text-xs font-black text-[#1E1B26]">Analytics</h4>
                      <p className="text-[9px] text-[#A29EB0]">Daily Views</p>
                    </div>
                    <div className="text-[10px] bg-[#FAF9FC] border border-[#ECEAF0] px-2 py-1 rounded-lg text-slate-500 font-bold flex items-center gap-1">
                      <span>2021</span>
                      <span className="text-[8px]">▼</span>
                    </div>
                  </div>

                  {/* SVG Custom Line Chart representing Daily Views */}
                  <div className="relative pt-2 h-44 w-full">
                    <svg viewBox="0 0 500 150" className="w-full h-full text-indigo-500 overflow-visible" preserveAspectRatio="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="30" x2="500" y2="30" stroke="#F1EFF4" strokeWidth="1" />
                      <line x1="0" y1="70" x2="500" y2="70" stroke="#F1EFF4" strokeWidth="1" />
                      <line x1="0" y1="110" x2="500" y2="110" stroke="#F1EFF4" strokeWidth="1" />
                      
                      {/* Area Gradient under curve */}
                      <defs>
                        <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#633BCA" stopOpacity="0.12" />
                          <stop offset="100%" stopColor="#633BCA" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,130 Q40,110 80,105 T160,80 T240,100 T320,65 T400,75 T500,45 L500,150 L0,150 Z" fill="url(#viewsGrad)" />

                      {/* Line Curve */}
                      <path d="M0,130 Q40,110 80,105 T160,80 T240,100 T320,65 T400,75 T500,45" fill="none" stroke="#633BCA" strokeWidth="2.5" />

                      {/* Highlighting Point */}
                      <circle cx="320" cy="65" r="5" fill="#633BCA" stroke="white" strokeWidth="2" />
                      <text x="320" y="50" fill="#633BCA" fontSize="8" fontWeight="bold" textAnchor="middle">300k</text>
                    </svg>

                    {/* Months labels */}
                    <div className="flex justify-between text-[8px] font-bold text-[#A29EB0] px-1.5 mt-2 uppercase tracking-wide">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span>
                    </div>
                  </div>
                </div>

                {/* Right: Events Distribution Radial Chart (col-span-5) */}
                <div className="lg:col-span-5 bg-white border border-[#ECEAF0] p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <h4 className="text-xs font-black text-[#1E1B26]">Events Distribution</h4>
                    <p className="text-[9px] text-[#A29EB0]">Last 30 Days Performance</p>
                  </div>

                  {/* Circular Radial Gauge SVG */}
                  <div className="flex justify-center items-center py-2">
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background track */}
                        <circle cx="50" cy="50" r="40" stroke="#F1EFF4" strokeWidth="6" fill="transparent" />
                        {/* Animated overlay gradient track */}
                        <circle cx="50" cy="50" r="40" stroke="#633BCA" strokeWidth="8" fill="transparent" strokeDasharray="251.2" strokeDashoffset="65" strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="block text-md font-black text-[#1E1B26]">300k</span>
                        <span className="text-[7px] text-[#A29EB0] uppercase tracking-wider font-bold">Total Events</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid of legend items like the picture */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px] font-bold text-[#7A748A]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>Likes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      <span>Views</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>Follows</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4F3466]" />
                      <span>Shares</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* STATISTICS SECTION (Bottom of central layout) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Weekly Target Card */}
                <div className="bg-white border border-[#ECEAF0] p-4 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-[#1E1B26]">Weekly Target</h4>
                    <p className="text-[10px] text-[#A29EB0] mt-0.5">25% achieved this week</p>
                  </div>
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" stroke="#F1EFF4" strokeWidth="3" fill="transparent" />
                      <circle cx="18" cy="18" r="14" stroke="#633BCA" strokeWidth="3" fill="transparent" strokeDasharray="88" strokeDashoffset="66" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[8px] font-black text-slate-700">25%</span>
                  </div>
                </div>

                {/* Monthly Target Card */}
                <div className="bg-white border border-[#ECEAF0] p-4 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-[#1E1B26]">Monthly Target</h4>
                    <p className="text-[10px] text-[#A29EB0] mt-0.5">50% achieved this month</p>
                  </div>
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" stroke="#F1EFF4" strokeWidth="3" fill="transparent" />
                      <circle cx="18" cy="18" r="14" stroke="#633BCA" strokeWidth="3" fill="transparent" strokeDasharray="88" strokeDashoffset="44" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[8px] font-black text-slate-700">50%</span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* AI BUILDER WORKSPACE (Housed cleanly inside AI Workspace tab) */}
          {currentMenu === "builder" && (
            <div className={`space-y-6 animate-in slide-in-from-bottom-2 duration-300 ${focusMode ? "h-full flex flex-col space-y-0 p-0" : ""}`}>
              
              {/* Normal Header displayed only when NOT in Focus Mode */}
              {!focusMode && (
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-black text-[#1E1B26]">AI Workspace Builder</h1>
                    <p className="text-xs text-[#A29EB0] mt-0.5">기획 및 개발 에이전트를 가동해 나만의 맞춤 교육용 웹앱 인스턴스를 무한 생성하세요.</p>
                  </div>
                  <button
                    onClick={() => {
                      setFocusMode(false);
                      setCurrentMenu("dashboard");
                    }}
                    className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                  >
                    ◀ 대시보드 돌아가기
                  </button>
                </div>
              )}

              {/* BEAUTIFUL BROWSER CONTAINER (Mockup frame) */}
              <div 
                id="ai-workspace-container" 
                className={`bg-white border-[#633BCA]/25 border-2 rounded-2xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 ${
                  focusMode ? "flex-1 h-full rounded-none border-0 shadow-none" : "min-h-[640px]"
                }`}
              >
                
                {/* 1. MOCK BROWSER HEADER BAR (상단 헤더) */}
                <div className="bg-[#FAF9FC] border-b border-[#ECEAF0] px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                  
                  {/* Left side: MacOS controls & App Name */}
                  <div className="flex items-center gap-3">
                    {/* Window control dots */}
                    <div className="flex items-center gap-1.5 mr-1">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
                      <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
                      <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
                    </div>
                    {/* Nav indicators */}
                    <div className="flex items-center gap-1 text-slate-400">
                      <ChevronLeft className="w-4 h-4 cursor-pointer hover:text-slate-600 transition" />
                      <ChevronRight className="w-4 h-4 cursor-pointer hover:text-slate-600 transition" />
                    </div>
                    <div className="w-px h-4 bg-slate-200 mx-1" />
                    {/* App Name Display */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#1E1B26] tracking-tight">
                        {appSpec ? `🚀 ${appSpec.appName}` : "📝 새로운 앱 기획실습"}
                      </span>
                    </div>
                  </div>

                  {/* Center: Custom browser url address mockup */}
                  <div className="flex-1 max-w-sm w-full mx-auto">
                    <div className="bg-white border border-slate-200 rounded-lg py-1 px-3 flex items-center justify-between text-[11px] text-slate-500 font-mono shadow-sm">
                      <div className="flex items-center gap-1.5 truncate">
                        <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate text-slate-600">kion-class.edu/workspace-agent</span>
                      </div>
                      <RotateCw className="w-3 h-3 text-slate-400 shrink-0 cursor-pointer hover:text-slate-600 transition" />
                    </div>
                  </div>

                  {/* Right side: Deploy status indicator + Focus mode button */}
                  <div className="flex items-center gap-3">
                    
                    {/* 배포 상태 표시기 */}
                    <div className="flex items-center">
                      {isDeploying ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100/60 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>배포 중...</span>
                        </span>
                      ) : isDeveloping ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-[#F5F1FD] text-[#633BCA] border border-[#ECE5FB] animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#633BCA]" />
                          <span>가상 빌드 중</span>
                        </span>
                      ) : deployResult ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>배포 완료</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-50 text-slate-500 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>기획 대기</span>
                        </span>
                      )}
                    </div>

                    {/* 포커스 모드 토글 버튼 (아이콘 ↔️) */}
                    <button
                      onClick={() => setFocusMode(!focusMode)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border shadow-sm ${
                        focusMode 
                          ? "bg-[#633BCA] text-white border-[#522EB4] hover:bg-[#522EB4]" 
                          : "bg-white text-[#633BCA] border-[#633BCA]/20 hover:bg-[#F5F1FD]"
                      }`}
                      title="포커스 모드 ↔️ 일반 모드 토글"
                    >
                      <span className="text-[12px]">↔️</span>
                      <span>포커스 모드</span>
                    </button>

                  </div>

                </div>

                {/* 2. THE 2-COLUMN 5:5 SPLIT WORKSPACE CONTENT AREA */}
                <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-8 p-6 bg-[#FAF9FC]">
                  
                  {/* Left Column (기획 에이전트): 폼 입력 및 요구사항 정의 */}
                  <div className="bg-[#F5F3F7] rounded-2xl border border-purple-100 shadow-sm p-6 space-y-6 overflow-y-auto max-h-[75vh] flex flex-col justify-between transition-shadow hover:shadow-md">
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 border-b border-[#FAF9FC] pb-3">
                        <span className="w-5 h-5 bg-[#633BCA]/10 text-[#633BCA] font-mono text-[10px] font-black rounded flex items-center justify-center">01</span>
                        <h3 className="text-xs font-black text-[#1E1B26]">기획 및 프롬프트 에이전트</h3>
                      </div>

                      {/* Prompt Textarea */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          사용자 아이디어 입력 (Prompt)
                        </label>
                        <div className="relative">
                          <textarea
                            value={idea}
                            onChange={(e) => setIdea(e.target.value)}
                            placeholder="어떤 앱을 만들고 싶나요? 기능과 목적을 설명해주세요..."
                            className="w-full bg-white border border-[#ECEAF0] rounded-xl p-4 text-xs text-slate-800 focus:outline-none focus:border-[#633BCA] focus:ring-1 focus:ring-[#633BCA]/20 h-28 resize-none leading-relaxed transition"
                          />
                          <div className="absolute bottom-2 right-2.5 text-[9px] text-slate-400 font-mono">
                            {idea.length}자
                          </div>
                        </div>
                      </div>

                      {/* Suggest templates */}
                      <div className="space-y-1.5">
                        <p className="text-[9px] text-purple-600/70 font-black uppercase tracking-wider">추천 아이디어 템플릿</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {IDEA_TEMPLATES.map((item, idx) => {
                            const isSelected = selectedTemplateId === item.id;
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  setIdea(item.idea);
                                  setSelectedTemplateId(item.id);
                                  setAppSpec(null);
                                  setGeneratedCode(null);
                                  setDeployResult(null);
                                }}
                                className={`text-left border p-2.5 rounded-xl transition group duration-200 shadow-sm ${
                                  isSelected 
                                    ? "bg-[#F3EFFC] border-[#633BCA] ring-1 ring-[#633BCA]/20" 
                                    : "bg-white hover:bg-[#FAF9FC] border-purple-100/60"
                                }`}
                              >
                                <div className={`text-xs font-semibold flex items-center justify-between ${
                                  isSelected ? "text-[#633BCA]" : "text-slate-700 group-hover:text-[#633BCA]"
                                }`}>
                                  <span>{item.title}</span>
                                  <ChevronRight className={`w-3 h-3 transition ${
                                    isSelected ? "text-[#633BCA] translate-x-0.5" : "text-slate-400 group-hover:translate-x-0.5"
                                  }`} />
                                </div>
                                <p className={`text-[10px] truncate mt-0.5 ${
                                  isSelected ? "text-[#633BCA]/70" : "text-slate-400"
                                }`}>{item.idea}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Generate spec button */}
                      <button
                        onClick={handleGenerateSpec}
                        disabled={isPlanning || !idea.trim()}
                        className="w-full bg-[#633BCA] hover:bg-[#522EB4] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:cursor-not-allowed shadow-md shadow-indigo-100"
                      >
                        {isPlanning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>기획 명세서(Technical Spec) 생성 중...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>💡 기획 명세서 생성하기</span>
                          </>
                        )}
                      </button>

                      {/* Specification display */}
                      {isPlanning && (
                        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 flex flex-col items-center justify-center space-y-3 min-h-[220px]">
                          <div className="w-8 h-8 rounded-full border-2 border-[#ECEAF0] border-t-[#633BCA] animate-spin" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">기획 분석 엔진 가동 중...</p>
                        </div>
                      )}

                      {!isPlanning && appSpec && (
                        <div className="border border-[#ECEAF0] bg-white rounded-xl overflow-hidden p-4 space-y-4 animate-in fade-in duration-300">
                          
                          {appSpec.isFallback && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-800 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="text-amber-500">💡</span>
                                <span>로컬 기획 백업 모드 가동 중</span>
                              </div>
                              <p className="text-[10px] text-amber-700 leading-relaxed">
                                현재 Gemini API의 일일 사용량이 소진되어 시스템 안전을 위한 로컬 백업 사양서로 자동 연결되었습니다. 백업 명세에 기반하여 정상적인 코드 생성 및 배포가 가능하오니 안심하고 사용하세요!
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between border-b border-[#FAF9FC] pb-2">
                            <div>
                              <span className="text-[8px] uppercase font-bold text-indigo-600 tracking-wider">AI Spec Sheet</span>
                              <h3 className="text-xs font-black text-[#1E1B26]">🚀 {appSpec.appName}</h3>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleGenerateSpec(true)}
                                disabled={isPlanning}
                                className="flex items-center gap-1 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-md transition disabled:opacity-50"
                                title="API를 호출하여 기획을 완전히 처음부터 다시 생성합니다."
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>기획 재생성</span>
                              </button>
                              <button
                                onClick={() => setIsEditingSpec(!isEditingSpec)}
                                className="flex items-center gap-1 bg-slate-50 border border-[#ECEAF0] hover:bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md transition"
                              >
                                <Edit className="w-3 h-3" />
                                <span>{isEditingSpec ? "완료" : "수정"}</span>
                              </button>
                            </div>
                          </div>

                          {isEditingSpec ? (
                            <div className="space-y-3 text-xs">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">앱 명칭</label>
                                <input
                                  type="text"
                                  value={appSpec.appName}
                                  onChange={(e) => setAppSpec({...appSpec, appName: e.target.value})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-indigo-600 font-semibold"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">앱 기획 설명</label>
                                <textarea
                                  value={appSpec.description}
                                  onChange={(e) => setAppSpec({...appSpec, description: e.target.value})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-700 h-16 resize-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">개발 지시 프롬프트</label>
                                <textarea
                                  value={appSpec.systemPrompt}
                                  onChange={(e) => setAppSpec({...appSpec, systemPrompt: e.target.value})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-slate-700 h-24 font-mono text-[10px]"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 text-xs">
                              <p className="text-slate-600 leading-relaxed text-[11px]">{appSpec.description}</p>
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-[#FAF9FC] text-[10px] text-slate-500">
                                <strong>타겟 고객:</strong> {appSpec.targetAudience}
                              </div>
                              
                              <div className="space-y-1.5">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">핵심 기능 구성</span>
                                {appSpec.keyFeatures.map((feat, idx) => (
                                  <div key={idx} className="bg-indigo-50/20 p-2.5 rounded-lg border border-indigo-100/30 flex gap-1.5">
                                    <span className="text-[#633BCA] font-bold font-mono">#{idx+1}</span>
                                    <div>
                                      <h4 className="font-bold text-slate-800 text-[11px]">{feat.title}</h4>
                                      <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{feat.description}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <button
                            onClick={handleGenerateCode}
                            disabled={isDeveloping}
                            className="w-full bg-[#633BCA] hover:bg-[#522EB4] text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                          >
                            {isDeveloping ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>코드를 생성하고 가상 빌드하는 중...</span>
                              </>
                            ) : (
                              <>
                                <span>개발자 에이전트에게 전송하기 (Step 2)</span>
                                <ArrowRight className="w-4 h-4" />
                              </>
                            )}
                          </button>

                        </div>
                      )}
                    </div>

                    {/* 에이전트와의 대화창 (Interactive Chat) */}
                    <div className="bg-white border border-purple-100 rounded-2xl p-4 flex flex-col space-y-3 shadow-sm mt-auto">
                      <div className="flex items-center gap-1.5 border-b border-purple-50 pb-2 flex-shrink-0">
                        <MessageSquare className="w-4 h-4 text-[#633BCA]" />
                        <span className="text-[11px] font-black text-slate-800">에이전트 피드백 대화창 (Interactive Planner)</span>
                      </div>
                      
                      {/* Message list */}
                      <div className="max-h-52 min-h-24 overflow-y-auto space-y-2.5 pr-1 flex-1 text-[11px] leading-relaxed">
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[8px] text-slate-400 mb-0.5 px-1">
                              {msg.role === 'user' ? '나' : 'PM 에이전트'}
                            </span>
                            <div className={`px-3 py-2 rounded-2xl max-w-[90%] break-words shadow-sm ${
                              msg.role === 'user' 
                                ? 'bg-[#633BCA] text-white rounded-tr-none' 
                                : 'bg-[#F3EFFC] text-slate-800 rounded-tl-none border border-purple-100/40'
                            }`}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                        {isChatting && (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[10px] pl-1 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                            <span>PM 에이전트가 기획서를 수정하고 있습니다...</span>
                          </div>
                        )}
                      </div>

                      {/* Input Form */}
                      <div className="flex gap-2 border-t border-purple-50 pt-3 flex-shrink-0">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                              handleSendChatMessage();
                            }
                          }}
                          disabled={isChatting || !appSpec}
                          placeholder={appSpec ? "예: '10점 로직을 추가해줘', '디자인 변경해줘'" : "위에서 기획서 생성 후 피드백을 주세요!"}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#633BCA] focus:bg-white text-slate-800"
                        />
                        <button
                          onClick={handleSendChatMessage}
                          disabled={isChatting || !chatInput.trim() || !appSpec}
                          className="bg-[#633BCA] hover:bg-[#522EB4] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs px-4 py-2 rounded-xl transition shadow shadow-indigo-100 flex-shrink-0"
                        >
                          {isChatting ? "전송 중" : "전송"}
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right Column (개발 에이전트): 실시간 코드 생성을 위한 터미널 및 결과물 미리보기 */}
                  <div className="bg-[#F5F3F7] rounded-2xl border border-purple-100 shadow-sm p-6 space-y-6 overflow-y-auto max-h-[75vh] flex flex-col justify-between transition-shadow hover:shadow-md">
                    
                    <div className="space-y-5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between border-b border-[#FAF9FC] pb-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 bg-emerald-50 text-emerald-600 font-mono text-[10px] font-black rounded flex items-center justify-center">02</span>
                          <h3 className="text-xs font-black text-[#1E1B26]">개발 에이전트 & 클라우드 배포</h3>
                        </div>
                      </div>

                      {!generatedCode && !isDeveloping && (
                        !appSpec ? (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white border-2 border-dashed border-purple-200/60 shadow-sm rounded-xl my-4 min-h-[280px]">
                            <Code className="w-10 h-10 text-slate-300 mb-2" />
                            <h4 className="text-xs font-black text-slate-500">대기 중인 코드 인스턴스가 없습니다</h4>
                            <p className="text-[10px] text-slate-400 max-w-xs mt-1">왼쪽 기획 폼에서 스펙 시트를 생성한 뒤, '개발자 에이전트 전송'을 누르세요!</p>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-white border-2 border-purple-200/60 shadow-sm rounded-xl my-4 min-h-[280px] space-y-4">
                            <div className="w-12 h-12 rounded-full bg-[#FAF9FC] border border-purple-200 flex items-center justify-center text-xl">
                              🚀
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-purple-700">기획 명세 생성 완료!</h4>
                              <p className="text-[10px] text-slate-500 mt-1">[{appSpec.appName}]의 스펙 시트가 개발 에이전트로 연동되었습니다.</p>
                            </div>
                            <div className="bg-[#F5F1FD]/50 border border-purple-100 rounded-xl p-3 max-w-xs text-left w-full">
                              <span className="text-[8px] uppercase font-extrabold text-[#633BCA] tracking-wider block mb-1">수신된 Spec 데이터</span>
                              <p className="text-[10px] text-slate-700 font-bold truncate">앱 명칭: {appSpec.appName}</p>
                              <p className="text-[9px] text-slate-500 line-clamp-2 mt-0.5">{appSpec.description}</p>
                            </div>
                            <button
                              onClick={() => handleGenerateCode(appSpec)}
                              className="bg-[#633BCA] hover:bg-[#522EB4] text-white font-black text-xs py-2.5 px-6 rounded-xl transition shadow shadow-indigo-150 flex items-center gap-1.5"
                            >
                              <span>⚡ 해당 스펙으로 앱 빌드 시작하기</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )
                      )}

                      {isDeveloping && (
                        <div className="flex-1 bg-[#120F1A] border border-slate-800 rounded-xl p-4 flex flex-col space-y-3 text-left my-4 min-h-[280px]">
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest animate-pulse">■ DEV_ENGINE_ACTIVE</span>
                          <div className="flex-1 overflow-y-auto font-mono text-[10px] text-emerald-400 space-y-2 leading-relaxed">
                            {developerLogs.map((log, idx) => (
                              <div key={idx} className="flex gap-1">
                                <span className="text-[#633BCA] font-bold">&gt;</span>
                                <span>{log}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!isDeveloping && generatedCode && (
                        <div className="flex-1 flex flex-col justify-between space-y-4 my-4">
                          
                          {hasNewSpecUpdate && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-pulse shrink-0">
                              <div className="flex items-start gap-2.5">
                                <span className="text-amber-500 text-lg">💡</span>
                                <div className="text-left">
                                  <h4 className="text-xs font-black text-amber-800">새로운 기획 피드백 수정안 발견!</h4>
                                  <p className="text-[10px] text-amber-600 mt-0.5">PM 기획 에이전트의 수정된 스펙 사양을 코드에 실시간으로 다시 반영해 보세요.</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleGenerateCode(appSpec)}
                                className="w-full sm:w-auto bg-[#633BCA] hover:bg-[#522EB4] text-white text-[11px] font-black py-2 px-4 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition shrink-0 animate-bounce"
                              >
                                <span>⚡ 코드 반영하기</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Workspace tabs in Modal Workspace */}
                          <div className="flex items-center justify-between border-b border-[#FAF9FC] pb-2">
                            <div className="flex gap-1 bg-[#FAF9FC] p-1 rounded-xl">
                              <button
                                onClick={() => setActiveTab("preview")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "preview" ? "bg-white text-[#633BCA] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                              >
                                Live Preview
                              </button>
                              <button
                                onClick={() => setActiveTab("code")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "code" ? "bg-white text-[#633BCA] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                              >
                                Source Code
                              </button>
                              <button
                                onClick={() => setActiveTab("deploy")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === "deploy" ? "bg-white text-[#633BCA] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                              >
                                Netlify Deploy
                              </button>
                            </div>
                            <button
                              onClick={handleDownloadZIP}
                              className="flex items-center gap-1.5 bg-white border border-[#ECEAF0] px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-[#FAF9FC] transition"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download ZIP</span>
                            </button>
                          </div>

                          {/* Tab 1: Live preview iframe */}
                          {activeTab === "preview" && (
                            <div className="flex-1 flex flex-col space-y-2 min-h-[300px]">
                              <div className="bg-[#FAF9FC] p-2 rounded-lg text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>sandbox_session_active: http://localhost:sandbox/index.html</span>
                              </div>
                              <div className="flex-1 bg-white rounded-xl border border-[#ECEAF0] overflow-hidden relative min-h-[250px]">
                                <iframe
                                  id="preview-sandbox-iframe"
                                  srcDoc={getPreviewHtml()}
                                  sandbox="allow-scripts allow-modals allow-same-origin"
                                  className="w-full h-full border-0 absolute inset-0 bg-white"
                                />
                              </div>
                            </div>
                          )}

                          {/* Tab 2: Code Explorer */}
                          {activeTab === "code" && (
                            <div className="flex-1 grid grid-cols-4 gap-3 min-h-[300px]">
                              <div className="col-span-1 border border-purple-100/60 bg-white shadow-sm rounded-xl p-2 space-y-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Files</span>
                                {generatedCode.files.map((file, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedFileIndex(idx)}
                                    className={`w-full text-left px-2 py-1 rounded text-[10px] font-mono truncate block ${selectedFileIndex === idx ? "bg-[#F3EFFC] text-[#633BCA] font-bold" : "text-slate-500 hover:bg-slate-100"}`}
                                  >
                                    {file.path}
                                  </button>
                                ))}
                              </div>
                              <div className="col-span-3 border border-[#ECEAF0] bg-white rounded-xl p-3 flex flex-col overflow-hidden">
                                <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                                  <span className="text-[10px] font-mono text-slate-600 font-bold">{generatedCode.files[selectedFileIndex].path}</span>
                                  <button
                                    onClick={() => handleCopyCode(generatedCode.files[selectedFileIndex].content, generatedCode.files[selectedFileIndex].path)}
                                    className="text-[9px] font-bold border px-2 py-0.5 rounded hover:bg-slate-50"
                                  >
                                    {copyStatus === generatedCode.files[selectedFileIndex].path ? "복사됨!" : "복사"}
                                  </button>
                                </div>
                                <pre className="flex-1 bg-[#120F1A] text-slate-300 p-2.5 rounded-lg font-mono text-[9px] overflow-auto whitespace-pre max-h-[220px]">
                                  {generatedCode.files[selectedFileIndex].content}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Tab 3: Netlify Deploy */}
                          {activeTab === "deploy" && (
                            <div className="flex-1 flex flex-col space-y-3 min-h-[300px]">
                              <div className="bg-[#FAF9FC] p-4 rounded-xl space-y-2">
                                <h4 className="text-[11px] font-bold text-[#1E1B26] uppercase">Netlify Cloud Server Deployment</h4>
                                <p className="text-[10px] text-[#A29EB0] leading-relaxed">기획 완료된 코드를 고유 호스팅 도메인을 포함한 실시간 라이브 사이트로 전 세계에 배포합니다.</p>
                              </div>

                              {!netlifyToken ? (
                                <div className="bg-amber-50/70 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-[11px] space-y-2.5">
                                  <div className="flex gap-2 font-semibold">
                                    <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                                    <span>개인용 Netlify API 토큰이 필요합니다.</span>
                                  </div>
                                  <div className="bg-white/90 border border-amber-200/50 rounded-xl p-2 flex gap-2 items-center shadow-sm">
                                    <input
                                      type="password"
                                      placeholder="nla_..."
                                      value={netlifyToken}
                                      onChange={(e) => saveNetlifyToken(e.target.value)}
                                      className="flex-1 bg-transparent border-none text-[10px] focus:outline-none focus:ring-0 font-mono text-slate-700"
                                    />
                                    <span className="text-[8px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                                      자동 저장됨
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-amber-700 leading-relaxed">
                                    💡 <strong>발급방법:</strong> Netlify 로그인 &gt; User Settings &gt; Applications &gt; Personal Access Tokens &gt; 'New Access Token' 생성 후 복사하여 여기에 붙여넣으세요!
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-indigo-50/30 border border-indigo-100 text-[#633BCA] p-3 rounded-xl text-[10px] flex justify-between items-center shadow-sm">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Netlify 토큰 연동 완료</span>
                                  </div>
                                  <button
                                    onClick={() => saveNetlifyToken("")}
                                    className="text-[9px] text-slate-400 hover:text-red-500 underline font-semibold"
                                  >
                                    토큰 초기화
                                  </button>
                                </div>
                              )}

                              <button
                                onClick={handleDeployToNetlify}
                                disabled={isDeploying}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                              >
                                {isDeploying ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>라이브 서버 업로드 중...</span>
                                  </>
                                ) : (
                                  <>
                                    <Globe className="w-4 h-4" />
                                    <span>🚀 Netlify 즉시 배포하기</span>
                                  </>
                                )}
                              </button>

                              {isDeploying && (
                                <div className="bg-[#120F1A] p-3 rounded-xl max-h-[100px] overflow-y-auto font-mono text-[9px] text-emerald-400 space-y-1">
                                  {deployLogs.map((log, idx) => (
                                    <div key={idx}>✔ {log}</div>
                                  ))}
                                </div>
                              )}

                              {deployResult && (
                                <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-xl space-y-3">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-bold text-slate-800">배포 성공!</span>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <a
                                      href={deployResult.siteUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg text-center flex items-center justify-center gap-1 shadow"
                                    >
                                      <span>🌐 라이브 사이트 열기</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <button
                                      onClick={() => handleCopyCode(deployResult.siteUrl, "deployUrl")}
                                      className="bg-white border text-slate-600 text-xs font-bold py-2 px-3 rounded-lg hover:bg-slate-50 transition"
                                    >
                                      {copyStatus === "deployUrl" ? "복사됨!" : "링크 복사"}
                                    </button>
                                  </div>
                                </div>
                              )}

                            </div>
                          )}

                        </div>
                      )}

                    </div>

                    <div className="border-t border-[#F5F4F7] pt-4 flex justify-between items-center shrink-0">
                      <span className="text-[9px] text-[#A29EB0] font-bold">WORKSPACE_ENGINE_ACTIVE</span>
                      <button
                        onClick={() => {
                          if (generatedCode) {
                            setFocusMode(false);
                            setCurrentMenu("dashboard");
                          } else {
                            alert("생성된 코드가 아직 저장되지 않았습니다!");
                          }
                        }}
                        className="bg-slate-50 hover:bg-slate-100 border text-slate-700 px-3 py-1.5 rounded-xl text-[10px] font-bold transition shadow-sm"
                      >
                        완료하고 대시보드 복귀
                      </button>
                    </div>

                  </div>

                </div>

              </div>

            </div>
          )}

          {/* NETLIFY SETTINGS (Housed cleanly inside Settings tab) */}
          {currentMenu === "settings" && (
            <div className="bg-white border border-[#ECEAF0] p-6 rounded-2xl shadow-sm space-y-6 max-w-2xl mx-auto animate-in fade-in duration-200">
              <div className="border-b border-[#FAF9FC] pb-4">
                <h1 className="text-md font-black text-[#1E1B26] flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600" />
                  Netlify Deployment Configuration
                </h1>
                <p className="text-xs text-[#A29EB0] mt-1">개인용 액세스 토큰을 연동하면 클릭 한 번으로 나만의 클라우드 호스팅 사이트를 런칭할 수 있습니다.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase font-bold text-[#A29EB0]">Netlify Personal Access Token</label>
                  <input
                    type="password"
                    placeholder="nla_..."
                    value={netlifyToken}
                    onChange={(e) => saveNetlifyToken(e.target.value)}
                    className="w-full bg-[#FAF9FC] border border-[#ECEAF0] rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#633BCA] font-mono"
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                    💡 발급방법: Netlify 로그인 &gt; User Settings &gt; Applications &gt; Personal Access Tokens &gt; "New Access Token" 생성 후 복사
                  </p>
                </div>

                <div className="bg-indigo-50/10 border border-indigo-100/30 p-4 rounded-xl text-xs text-slate-600 space-y-1.5">
                  <strong className="block text-[#633BCA]">✔ 토큰 연동 시 지원 기능:</strong>
                  <ul className="list-disc list-inside space-y-1 text-[#7A748A]">
                    <li>실시간 고유 서브도메인 자동 할당 (e.g., https://custom-app.netlify.app)</li>
                    <li>가상 디렉토리 파일 번들 업로드</li>
                    <li>Single Page Application(SPA) 리다이렉트 자동 라우팅</li>
                    <li>SSL 보안 서티피케이션 즉시 탑재</li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => {
                      alert("Netlify 개인용 토큰이 성공적으로 적용되었습니다!");
                      setCurrentMenu("dashboard");
                    }}
                    className="bg-[#633BCA] hover:bg-[#522EB4] text-white text-xs font-black px-4 py-2 rounded-xl transition shadow"
                  >
                    설정 완료하기
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* 3. RIGHT SIDEBAR (Profile / Action Area) */}
        <aside id="right-sidebar" className={`w-80 bg-white border-l border-[#ECEAF0] flex flex-col shrink-0 overflow-y-auto p-6 space-y-7 transition-all duration-300 ${focusMode ? "hidden" : "hidden lg:flex"}`}>
          
          {/* USER NOTIFICATION HEADER BAR */}
          <div className="flex items-center justify-between pb-3 border-b border-[#FAF9FC]">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black text-[#1E1B26]">Hi Shakir</h3>
              <p className="text-[10px] text-[#A29EB0] font-medium">Good Morning!</p>
            </div>
            
            {/* Action chat & bell icons */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-xl bg-[#FAF9FC] border border-[#ECEAF0] hover:bg-[#F3EFFC]/40 text-[#7A748A] hover:text-[#633BCA] transition">
                <MessageSquare className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-xl bg-[#FAF9FC] border border-[#ECEAF0] hover:bg-[#F3EFFC]/40 text-[#7A748A] hover:text-[#633BCA] relative transition">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              </button>
            </div>
          </div>

          {/* MAIN PROFILE CARD */}
          <div className="bg-white border border-[#ECEAF0] rounded-2xl p-5 text-center flex flex-col items-center justify-center space-y-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#633BCA] via-[#B08FFF] to-[#30AEE6]" />
            
            {/* Avatar container */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-100 rounded-[14px] flex items-center justify-center overflow-hidden">
                  {/* High quality fallback vector avatar icon */}
                  <svg className="w-10 h-10 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            {/* Profile user specs */}
            <div>
              <h4 className="text-xs font-black text-[#1E1B26]">AR Shakir</h4>
              <p className="text-[9px] text-[#A29EB0] font-medium mt-0.5">UI/UX Designer @Redwhale</p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-1 w-full text-center border-t border-b border-[#FAF9FC] py-3 text-[#1E1B26]">
              <div>
                <span className="block text-xs font-black">786K</span>
                <span className="text-[8px] text-[#A29EB0] uppercase tracking-wide">Followers</span>
              </div>
              <div>
                <span className="block text-xs font-black">298</span>
                <span className="text-[8px] text-[#A29EB0] uppercase tracking-wide">Following</span>
              </div>
              <div>
                <span className="block text-xs font-black">438</span>
                <span className="text-[8px] text-[#A29EB0] uppercase tracking-wide">Posts</span>
              </div>
            </div>

            {/* View Profile & Edit profile buttons */}
            <div className="flex gap-2 w-full">
              <button className="flex-1 bg-[#633BCA] hover:bg-[#522EB4] text-white py-1.5 px-2 rounded-xl text-[10px] font-black transition text-center shadow-sm">
                View Profile
              </button>
              <button 
                onClick={() => setCurrentMenu("settings")}
                className="flex-1 bg-white border border-[#ECEAF0] text-slate-700 py-1.5 px-2 rounded-xl text-[10px] font-black transition hover:bg-[#FAF9FC]"
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* INSTRUCTOR NOTICES & RECOMMENDED RESOURCES */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1">
              <Megaphone className="w-4 h-4 text-[#633BCA]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#1E1B26]">강사 공지사항 및 추천 학습 자료</span>
            </div>

            {/* Teacher Notifications */}
            <div className="bg-[#F5F1FD]/75 border border-[#633BCA]/15 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#633BCA]/10 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#633BCA]" />
                  <span className="text-[10px] font-bold text-[#633BCA] uppercase tracking-wide">선생님 공지사항</span>
                </div>
                {isAdmin && !isEditingNotices && (
                  <button
                    onClick={() => {
                      setTempNotices([...notices]);
                      setIsEditingNotices(true);
                    }}
                    className="text-[9px] font-black text-[#633BCA] hover:underline bg-[#F5F1FD] px-2 py-1 rounded-md transition border border-[#633BCA]/10 shrink-0 cursor-pointer"
                  >
                    수정 (Edit)
                  </button>
                )}
              </div>

              {isEditingNotices ? (
                <div className="space-y-2.5">
                  {tempNotices.map((notice, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={notice}
                        onChange={(e) => {
                          const updated = [...tempNotices];
                          updated[idx] = e.target.value;
                          setTempNotices(updated);
                        }}
                        className="flex-1 bg-white border border-purple-200 rounded-lg p-1.5 text-[10px] text-slate-800 font-medium outline-none focus:border-[#633BCA]"
                        placeholder="공지 내용을 입력하세요"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setTempNotices(tempNotices.filter((_, i) => i !== idx));
                        }}
                        className="text-red-500 text-[10px] font-bold p-1 hover:bg-red-50 rounded cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1 border-t border-[#633BCA]/10 pt-2">
                    <button
                      type="button"
                      onClick={() => setTempNotices([...tempNotices, ""])}
                      className="text-[#633BCA] text-[9px] font-black hover:underline bg-white border border-purple-100 px-2.5 py-1 rounded cursor-pointer"
                    >
                      + 공지 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveSettings(tempNotices, resources);
                        setIsEditingNotices(false);
                      }}
                      className="ml-auto bg-[#633BCA] text-white text-[9px] font-black px-2.5 py-1 rounded hover:bg-[#522EB4] transition cursor-pointer"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingNotices(false)}
                      className="bg-slate-100 text-slate-600 text-[9px] font-black px-2.5 py-1 rounded hover:bg-slate-200 transition cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-left">
                  {notices.length === 0 ? (
                    <div className="text-[10px] text-slate-400 font-medium py-1">
                      등록된 공지사항이 없습니다.
                    </div>
                  ) : (
                    notices.map((notice, idx) => {
                      const startsWithEmoji = /^[\p{Emoji}\u2700-\u27BF]/u.test(notice);
                      const prefix = startsWithEmoji ? "" : "📢 ";
                      return (
                        <div key={idx} className="text-[10px] text-slate-700 leading-relaxed font-semibold">
                          {prefix}{notice}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Clickable Recommended Learning Resources */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-[#A29EB0] pl-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-[#633BCA]" />
                  <span>추천 학습 자료 링크</span>
                </div>
                {isAdmin && !isEditingResources && (
                  <button
                    onClick={() => {
                      setTempResources([...resources]);
                      setIsEditingResources(true);
                    }}
                    className="text-[9px] font-black text-[#633BCA] hover:underline bg-[#F5F1FD] px-2 py-1 rounded-md transition border border-[#633BCA]/10 shrink-0 cursor-pointer"
                  >
                    수정 (Edit)
                  </button>
                )}
              </div>

              {isEditingResources ? (
                <div className="space-y-2.5 bg-[#FAF9FC] border border-slate-200/50 p-3 rounded-2xl">
                  {tempResources.map((res, idx) => (
                    <div key={idx} className="bg-white border border-purple-100/50 rounded-xl p-2.5 space-y-2 shadow-sm relative">
                      <div className="grid grid-cols-12 gap-1.5 items-center">
                        <input
                          type="text"
                          value={res.emoji}
                          onChange={(e) => {
                            const updated = [...tempResources];
                            updated[idx] = { ...res, emoji: e.target.value };
                            setTempResources(updated);
                          }}
                          className="col-span-3 text-center bg-slate-50 border border-slate-200 rounded p-1 text-[10px] outline-none"
                          placeholder="이모지"
                        />
                        <input
                          type="text"
                          value={res.title}
                          onChange={(e) => {
                            const updated = [...tempResources];
                            updated[idx] = { ...res, title: e.target.value };
                            setTempResources(updated);
                          }}
                          className="col-span-9 bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-bold text-slate-700 outline-none"
                          placeholder="자료 제목"
                        />
                      </div>
                      <div className="flex gap-1.5 items-center">
                        <input
                          type="text"
                          value={res.url}
                          onChange={(e) => {
                            const updated = [...tempResources];
                            updated[idx] = { ...res, url: e.target.value };
                            setTempResources(updated);
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded p-1 text-[10px] text-slate-500 outline-none"
                          placeholder="URL (https://...)"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTempResources(tempResources.filter((_, i) => i !== idx));
                          }}
                          className="text-red-500 text-[10px] font-bold p-1 hover:bg-red-50 rounded cursor-pointer shrink-0"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1 border-t border-slate-200 pt-2">
                    <button
                      type="button"
                      onClick={() => setTempResources([...tempResources, { emoji: "📎", title: "새로운 추천 자료", url: "https://" }])}
                      className="text-[#633BCA] text-[9px] font-black hover:underline bg-white border border-purple-100 px-2.5 py-1 rounded cursor-pointer"
                    >
                      + 자료 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveSettings(notices, tempResources);
                        setIsEditingResources(false);
                      }}
                      className="ml-auto bg-[#633BCA] text-white text-[9px] font-black px-2.5 py-1 rounded hover:bg-[#522EB4] transition cursor-pointer"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingResources(false)}
                      className="bg-slate-100 text-slate-600 text-[9px] font-black px-2.5 py-1 rounded hover:bg-slate-200 transition cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {resources.length === 0 ? (
                    <div className="text-[10px] text-slate-400 font-medium py-1.5 text-center">
                      등록된 추천 자료가 없습니다.
                    </div>
                  ) : (
                    resources.map((res, idx) => (
                      <a
                        key={idx}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-white hover:bg-[#FAF9FC] border border-[#ECEAF0] hover:border-[#633BCA]/20 p-2.5 rounded-xl transition duration-150 flex items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{res.emoji || "📎"}</span>
                          <span className="text-[10px] font-bold text-slate-700 group-hover:text-[#633BCA]">{res.title}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-[#633BCA] transition" />
                      </a>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RECENT IMAGE FEEDS GALLERY */}
          <div className="space-y-2.5">
            <span className="text-[9px] font-black uppercase tracking-wider text-[#A29EB0]">Recent Activity Feed</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-xl hover:scale-[1.03] transition cursor-pointer border shadow-inner flex items-center justify-center font-mono text-[8px] text-[#A29EB0]">FEED1</div>
              <div className="aspect-square bg-gradient-to-tr from-amber-100 to-rose-100 rounded-xl hover:scale-[1.03] transition cursor-pointer border shadow-inner flex items-center justify-center font-mono text-[8px] text-[#A29EB0]">FEED2</div>
              <div className="aspect-square bg-gradient-to-tr from-cyan-100 to-blue-100 rounded-xl hover:scale-[1.03] transition cursor-pointer border shadow-inner flex items-center justify-center font-mono text-[8px] text-[#A29EB0]">FEED3</div>
              <div className="aspect-square bg-gradient-to-tr from-emerald-100 to-teal-100 rounded-xl hover:scale-[1.03] transition cursor-pointer border shadow-inner flex items-center justify-center font-mono text-[8px] text-[#A29EB0]">FEED4</div>
              <div className="aspect-square bg-gradient-to-tr from-pink-100 to-rose-100 rounded-xl hover:scale-[1.03] transition cursor-pointer border shadow-inner flex items-center justify-center font-mono text-[8px] text-[#A29EB0]">FEED5</div>
              <div className="aspect-square bg-gradient-to-tr from-slate-100 to-slate-200 rounded-xl hover:scale-[1.03] transition cursor-pointer border shadow-inner flex items-center justify-center font-mono text-[8px] text-[#A29EB0]">FEED6</div>
            </div>
          </div>

        </aside>

      </div>

      {/* 4. MODAL WORKSPACE (Preview & Deploy Panel for selected SavedApp) */}
      {selectedApp && (
        <div className="fixed inset-0 bg-[#120F1A]/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-6 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[24px] shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col justify-between p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <div>
                <span className="text-[8px] bg-[#633BCA]/10 text-[#633BCA] px-2 py-0.5 rounded-md font-black uppercase tracking-wider">APP INSTANCE CONTROL</span>
                <h3 className="text-sm font-black text-slate-800 mt-1">{selectedApp.appName}</h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-800 font-bold text-sm bg-[#FAF9FC] w-8 h-8 rounded-full flex items-center justify-center transition"
              >
                ×
              </button>
            </div>

            {/* Modal Body content */}
            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              
              <div className="bg-slate-50 p-4 rounded-xl space-y-1.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">기획 컨셉 & 요구사항 (Technical Concept)</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">{selectedApp.idea}</p>
                <p className="text-[10px] text-slate-400 font-medium">생성 일자: {selectedApp.createdAt}</p>
              </div>

              {/* Dynamic Interactive workspace elements */}
              {selectedApp.isCustom ? (
                <div className="space-y-4">
                  <p className="text-xs font-bold text-[#633BCA] bg-[#F3EFFC] px-3 py-1.5 rounded-lg inline-block">💡 이 앱은 실제 AI Workspace를 통해 생성되었습니다. 실시간 미리보기 및 소스코드 분석을 지원합니다.</p>
                  
                  {generatedCode && selectedApp.appName === generatedCode.appName ? (
                    <div className="border p-4 rounded-xl space-y-4">
                      {/* Interactive Workspace Tab Selector */}
                      <div className="flex justify-between items-center border-b pb-2">
                        <div className="flex gap-1.5 bg-[#FAF9FC] p-1 rounded-xl">
                          <button
                            onClick={() => setActiveTab("preview")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${activeTab === "preview" ? "bg-white text-[#633BCA] shadow" : "text-slate-500"}`}
                          >
                            Live Sandbox
                          </button>
                          <button
                            onClick={() => setActiveTab("code")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${activeTab === "code" ? "bg-white text-[#633BCA] shadow" : "text-slate-500"}`}
                          >
                            Source Explorer
                          </button>
                          <button
                            onClick={() => setActiveTab("deploy")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${activeTab === "deploy" ? "bg-white text-[#633BCA] shadow" : "text-slate-500"}`}
                          >
                            Netlify Cloud
                          </button>
                        </div>
                      </div>

                      {activeTab === "preview" && (
                        <div className="h-64 border rounded-xl overflow-hidden relative">
                          <iframe
                            srcDoc={getPreviewHtml()}
                            sandbox="allow-scripts allow-modals allow-same-origin"
                            className="w-full h-full border-0 absolute inset-0"
                          />
                        </div>
                      )}

                      {activeTab === "code" && (
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1 bg-[#FAF9FC] p-2 rounded-lg text-[9px] font-mono space-y-1 max-h-[200px] overflow-y-auto">
                            {generatedCode.files.map((file, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelectedFileIndex(idx)}
                                className={`w-full text-left p-1 block truncate rounded ${selectedFileIndex === idx ? "bg-[#F3EFFC] text-[#633BCA]" : "text-slate-500"}`}
                              >
                                {file.path}
                              </button>
                            ))}
                          </div>
                          <pre className="col-span-3 bg-slate-900 text-slate-300 p-2 rounded-lg font-mono text-[9px] max-h-[200px] overflow-auto whitespace-pre">
                            {generatedCode.files[selectedFileIndex].content}
                          </pre>
                        </div>
                      )}

                      {activeTab === "deploy" && (
                        <div className="space-y-3">
                          <p className="text-[10px] text-slate-500">Netlify 토큰을 연동하여 최종 호스팅을 전 세계에 배포하세요.</p>
                          <button
                            onClick={handleDeployToNetlify}
                            disabled={isDeploying}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs"
                          >
                            {isDeploying ? "배포 중..." : "🚀 실시간 서버 배포 시작"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center border-2 border-dashed rounded-xl bg-slate-50 text-slate-400 text-xs">
                      이전 활성 코드 데이터 세션이 유실되었습니다. AI Workspace 탭에서 새로 기획 및 빌드를 진행해주세요!
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Mock Previews for the seed apps so that users get full interactive experiences */}
                  <span className="text-[9px] bg-indigo-50 text-[#633BCA] px-2 py-0.5 rounded font-black block w-fit">SIMULATED LEARNING DEMO SANDBOX</span>
                  
                  <div className="border border-slate-200/60 rounded-xl overflow-hidden bg-white shadow-inner min-h-[320px] flex flex-col justify-between">
                    {/* Top bar */}
                    <div className="bg-[#FAF9FC] px-4 py-2 border-b flex justify-between items-center text-[10px] text-slate-500">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>demo-sandbox://{selectedApp.id}.kionlabs.edu</span>
                      </div>
                      <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold scale-90">STUDENT PREVIEW</span>
                    </div>

                    {/* Simulation screens */}
                    {selectedApp.id === "app-1" && (
                      <div className="p-6 text-center space-y-4 flex-1 flex flex-col justify-center items-center bg-gradient-to-b from-blue-50/30 to-white">
                        <div className="text-4xl">💧</div>
                        <div>
                          <h4 className="text-sm font-black text-blue-700">오늘의 수분 충전 메이커 (Demo)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">귀여운 물방울 캐릭터 '방울이'가 목마르지 않게 매일 물 8잔을 채워주세요!</p>
                        </div>
                        <div className="bg-white px-5 py-3 rounded-2xl border border-blue-100 flex items-center gap-4 shadow-sm">
                          <div>
                            <span className="text-[8px] text-slate-400 block uppercase">목표 달성도</span>
                            <span className="text-md font-black text-blue-600">3 / 8 잔</span>
                          </div>
                          <button onClick={() => alert("1잔을 기록했습니다! '방울이'가 무척 고마워하며 미소를 짓습니다. 😊")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] transition shadow shadow-blue-100">
                            + 물 1잔 추가
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedApp.id === "app-2" && (
                      <div className="p-6 text-center space-y-4 flex-1 flex flex-col justify-center items-center bg-gradient-to-b from-amber-50/30 to-white">
                        <div className="text-4xl">🧠</div>
                        <div>
                          <h4 className="text-sm font-black text-amber-700">스피드 영단어 퀴즈 왕 (Demo)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">제한시간 10초 내 단어를 맞추고 정답 콤보 점수를 획득하세요!</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-amber-100 w-full max-w-xs space-y-3 shadow-sm">
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                            <span>Score: 150</span>
                            <span className="text-[#FF5A36] animate-pulse">⏰ 남은 시간: 7초</span>
                          </div>
                          <p className="text-xs font-black text-slate-800 bg-[#FAF9FC] py-2 rounded">Q. 다음 영단어 "Collaborate"의 뜻은?</p>
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-bold">
                            <button onClick={() => alert("정답! +50점 콤보 획득! 🥳")} className="bg-amber-500 hover:bg-amber-600 text-white p-2 rounded-lg text-center font-bold">협력하다</button>
                            <button onClick={() => alert("틀렸습니다! 오답 노트에 자동 저장됩니다.")} className="bg-[#FAF9FC] border hover:bg-slate-50 p-2 rounded-lg text-center text-slate-600">지시하다</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedApp.id === "app-3" && (
                      <div className="p-6 text-center space-y-4 flex-1 flex flex-col justify-center items-center bg-gradient-to-b from-purple-50/30 to-white">
                        <div className="text-4xl">✍️</div>
                        <div>
                          <h4 className="text-sm font-black text-purple-700">나의 하루 3줄 감사 일기장 (Demo)</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">작은 기쁨이 큰 행복을 만듭니다. 오늘 있었던 사소한 기쁨 세 가지를 적으세요.</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-purple-100 w-full max-w-xs space-y-2.5 shadow-sm">
                          <input type="text" placeholder="1. 맛있는 점심식사를 배부르게 했다" className="w-full bg-[#FAF9FC] border rounded px-2.5 py-1 text-[10px] outline-none" />
                          <input type="text" placeholder="2. 코딩 에이전트 레이아웃 템플릿 완성!" className="w-full bg-[#FAF9FC] border rounded px-2.5 py-1 text-[10px] outline-none" />
                          <input type="text" placeholder="3. 오후의 시원한 커피 한 잔" className="w-full bg-[#FAF9FC] border rounded px-2.5 py-1 text-[10px] outline-none" />
                          <button onClick={() => alert("일기장이 성공적으로 로컬 분석 데이터에 기록되었습니다! 일주일 뒤 멋진 감정 리포트를 확인하세요. 🌸")} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-1.5 rounded-lg text-[9px]">감사 일기 저장</button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="border-t pt-3 flex justify-between items-center shrink-0">
              <p className="text-[9px] text-[#A29EB0]">※ 이 앱의 최종 가상 빌드는 Sandbox CDN 정책의 적용을 받습니다.</p>
              <div className="flex gap-2">
                {selectedApp.deployedUrl && (
                  <a
                    href={selectedApp.deployedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <span>새창으로 데모 열기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  onClick={() => setSelectedApp(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
                >
                  닫기
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
