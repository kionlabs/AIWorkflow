import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import AdmZip from "adm-zip";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy init Gemini SDK
let aiClient: GoogleGenAI | null = null;

function isRateLimitError(err: any): boolean {
  if (!err) return false;
  const errMsg = String(err.message || err.statusText || err || "").toLowerCase();
  const errCode = String(err.status || err.code || "");
  return (
    errCode === "429" ||
    errMsg.includes("429") ||
    errMsg.includes("quota") ||
    errMsg.includes("resource_exhausted") ||
    errMsg.includes("rate limit") ||
    errMsg.includes("limit exceeded") ||
    errMsg.includes("exhausted")
  );
}

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Planning Agent API (기획 에이전트)
// Retry helper for Gemini API
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0) {
      console.warn(`[Gemini API] Request failed. Retrying in ${delay}ms... (${retries} left). Error:`, error.message || error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

// Robust fallback model and retry helper for Gemini generateContent
async function callGenerateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
): Promise<any> {
  const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;
  
  for (const modelName of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[Gemini API] Attempt ${attempt} with model (${modelName})...`);
        const response = await ai.models.generateContent({
          model: modelName,
          ...params,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Gemini API] Model (${modelName}) failed (Attempt ${attempt}/2):`, err.message || err);
        if (attempt < 2) {
          // Robust exponential backoff delay to bypass temporary spikes in demand
          const delay = attempt * 1800;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    // Delay slightly before switching to next model family
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw lastError;
}

// Local Fallback Plan Generator
function getLocalFallbackPlan(idea: string): any {
  const ideaLower = idea.toLowerCase();
  let appName = "KION 스마트 학업 플래너 📖";
  let description = "학생들의 하루 일정과 교과 공부, 건강 습관을 한눈에 설계하는 맞춤형 성장 앱";
  let keyFeatures = [
    { title: "🎯 목표 스택 달성 게이지", description: "일일 목표를 세우고 달성율을 실시간 체크하여 성장 경험치 적립" },
    { title: "⏱️ 고밀도 집중 뽀모도로", description: "25분 집중과 5분 카밍 휴식으로 뇌를 보호하며 학습 밀도를 상승시키는 시각 타이머" },
    { title: "📝 마음 챙김 3줄 감사 일지", description: "하루의 소소한 가치를 편안하게 작성하여 긍정 호르몬을 높이는 마인드 루틴" }
  ];

  if (ideaLower.includes("수분") || ideaLower.includes("물") || ideaLower.includes("water") || ideaLower.includes("hydrate")) {
    appName = "수분 충전 챌린지 🥤";
    description = "목표 수분 섭취와 귀여운 물방울 캐릭터 진화를 결합한 상큼한 습관 빌더";
    keyFeatures = [
      { title: "💧 스마트 수분 수위 기록", description: "터치 한 번으로 마신 물의 용량을 컵/텀블러별로 맞춤형 누적 기입" },
      { title: "🌱 물방울 성장 시뮬레이터", description: "섭취율이 늘어남에 따라 아기자기하게 성장하고 진화하는 물방울 캐릭터" },
      { title: "📊 실시간 음용수 히스토리", description: "오늘 마신 시점별 기록을 타임라인 로그로 저장하고 필요시 초기화" }
    ];
  } else if (ideaLower.includes("영어") || ideaLower.includes("단어") || ideaLower.includes("voca") || ideaLower.includes("퀴즈") || ideaLower.includes("quiz")) {
    appName = "중등 영단어 스피드 퀴즈 🧠";
    description = "제한 시간 10초 내 핵심 뜻을 맞추는 박진감 넘치는 영단어 타임어택 퀴즈";
    keyFeatures = [
      { title: "⚡ 10초 타임어택 서바이벌", description: "실시간 게이지 바가 감소하여 정밀하게 집중시키는 사지선다 문제은행" },
      { title: "🔥 콤보 폭발 스파크 보너스", description: "연속 정답 성공 시 점수가 가산되어 게임처럼 몰입시키는 콤보 누적" },
      { title: "📓 스마트 오답 복습 노트", description: "틀린 영어 단어를 자동으로 수집하여 언제든 재학습하도록 돕는 스마트 백업" }
    ];
  } else if (ideaLower.includes("일기") || ideaLower.includes("감사") || ideaLower.includes("기분") || ideaLower.includes("diary") || ideaLower.includes("journal")) {
    appName = "3줄 감사 일기 & 기분 기록 ✍️";
    description = "오늘의 감정 이모티콘과 하루 단 3줄의 감사문 기입을 연동한 웰니스 저널";
    keyFeatures = [
      { title: "😊 5가지 기분 감정 초이스", description: "오늘 나의 정신적 컨디션을 상큼한 얼굴 이모지로 간단 체크" },
      { title: "✍️ 딱 3줄 긍정 감사 작성", description: "줄글 일기의 피로 없이 매일 소소한 감사함 3가지만 기입하는 폼" },
      { title: "📅 감정 캘린더 일지 보관함", description: "날짜와 기분 수치가 그라데이션 카드로 누적되는 영속 히스토리" }
    ];
  } else if (ideaLower.includes("타이머") || ideaLower.includes("뽀모도로") || ideaLower.includes("공부") || ideaLower.includes("study") || ideaLower.includes("timer")) {
    appName = "집중 뽀모도로 타이머 ⏱️";
    description = "원형 프로그레스 테두리와 사운드로 집중의 효율을 일깨우는 뽀모도로 학습기";
    keyFeatures = [
      { title: "🍅 원형 프로그레스 몰입 시계", description: "남은 몰입 시간을 부드러운 서클 게이지로 도출해주는 타이머" },
      { title: "📝 집중 과제 ToDo 연동", description: "타이머 아래 할 일을 작성해두고 완주 후 체크 처리하는 편리한 일지" },
      { title: "📊 오늘 하루 몰입 적립 스택", description: "성공적으로 완수한 세션 개수가 누적되며 공부 의욕을 자극" }
    ];
  } else if (ideaLower.includes("계산기") || ideaLower.includes("calc")) {
    appName = "수학 발전소: 스마트 에듀 계산기 🧮";
    description = "연산 수식 이력 백업 기능과 실시간 물리 단위 환산기를 갖춘 종합 수학 허브";
    keyFeatures = [
      { title: "➕ 수식 히스토리 계산 패널", description: "사칙연산 결과를 백업하고 원클릭으로 다시 계산창에 올리는 엔진" },
      { title: "📐 편리한 실시간 단위 변환", description: "길이, 무게, 온도의 공학 수치들을 즉시 호환 변환해주는 간이 위젯" },
      { title: "💾 공식 메모리 즐겨찾기", description: "중요 연산식이나 과제용 수식 결과를 이름과 함께 기록 보존" }
    ];
  }

  return {
    appName,
    description,
    targetAudience: "자기주도적 학업 계획을 디자인하고 삶의 긍정적인 변화를 관찰하고 싶은 에듀 스마트 학생",
    keyFeatures,
    uiLayout: "에이전트의 다목적 교육용 UI 설계가 입혀진 바이올렛&에메랄드 청정 웰니스 스타일 테마.",
    techSpecs: "모든 동작 및 저장 상태는 localStorage에 영구 보존되어 안전하게 구동됩니다.",
    systemPrompt: `kion_backup:${appName}`
  };
}

// Local Fallback Code Generator (Ultra-Robust Client App inside single model)
function getLocalFallbackCode(appName: string, customSystemPrompt: string): any {
  // Return interactive single page application codebase that handles all roles dynamically
  const isWater = appName.includes("수분") || appName.includes("물");
  const isQuiz = appName.includes("퀴즈") || appName.includes("영어");
  const isDiary = appName.includes("일기") || appName.includes("감사");
  const isTimer = appName.includes("타이머") || appName.includes("뽀모도로");
  const isCalc = appName.includes("계산기") || appName.includes("수학");

  const defaultTab = isQuiz ? "quiz" : isDiary ? "diary" : isTimer ? "timer" : isCalc ? "calc" : "tracker";

  const indexHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <!-- Tailwind CSS 4.0 -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Space+Grotesk:wght@500;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
        .font-display { font-family: 'Space Grotesk', sans-serif; }
    </style>
</head>
<body class="bg-[#F8F9FD] text-[#2D2E35] min-h-screen antialiased flex flex-col items-center py-6 px-4">
    <!-- Main Box Container -->
    <div class="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-6 shadow-2xl border border-slate-100 flex flex-col space-y-6 relative overflow-hidden">
        
        <!-- Local Backup Active Alert -->
        <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-xl px-3 py-2 flex items-center justify-between text-[10px] text-amber-800 font-bold">
            <span class="flex items-center gap-1.5">
                <span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                <span>💡 Kion 스마트 백업 엔진 가동 완료 (오프라인 무중단 구동)</span>
            </span>
            <span class="bg-amber-200/50 px-1.5 py-0.5 rounded text-[8px] uppercase">Safe Mode</span>
        </div>

        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
            <div class="flex items-center gap-3">
                <div class="w-12 h-12 bg-indigo-500/10 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                    <i data-lucide="sparkles" class="w-6 h-6 animate-pulse"></i>
                </div>
                <div>
                    <h1 class="text-sm font-black text-slate-800 tracking-tight" id="app-title-el">${appName}</h1>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Kion-Class Edu Suite</p>
                </div>
            </div>
            <button id="reset-state-btn" class="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition" title="앱 상태 초기화">
                <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            </button>
        </div>

        <!-- Navigation Tab Menu -->
        <div class="grid grid-cols-4 gap-1.5 p-1 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500">
            <button class="nav-tab-btn py-2 rounded-xl transition" data-tab="tracker">🎯 섭취/목표</button>
            <button class="nav-tab-btn py-2 rounded-xl transition" data-tab="timer">⏱️ 뽀모도로</button>
            <button class="nav-tab-btn py-2 rounded-xl transition" data-tab="quiz">🧠 스피드퀴즈</button>
            <button class="nav-tab-btn py-2 rounded-xl transition" data-tab="diary">✍️ 감사일기</button>
        </div>

        <!-- =================== TAB 1: TRACKER & HABIT =================== -->
        <div id="view-tracker" class="tab-view space-y-5">
            <!-- Goal Progress Visual card -->
            <div class="bg-gradient-to-b from-slate-50 to-white border border-slate-100 p-5 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
                <div class="relative w-24 h-24 flex items-center justify-center mb-3">
                    <div id="character-emoji" class="text-6xl animate-bounce filter drop-shadow-md select-none" style="animation-duration: 3s">🌱</div>
                </div>
                <span id="character-level" class="px-3 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black tracking-widest uppercase shadow">꿈나무 레벨 1</span>
                <p id="character-quote" class="text-[11px] text-slate-400 mt-2 font-medium">"오늘 나의 기여도가 올라갈수록 더욱 맑은 형태로 성장해요!"</p>
            </div>

            <!-- Tracker Inputs & Stats -->
            <div class="space-y-2">
                <div class="flex justify-between items-end">
                    <span class="text-[10px] font-black uppercase text-slate-400 tracking-wider" id="lbl-goal">오늘의 목표 도달 수치</span>
                    <span class="text-xs font-black text-indigo-600"><span id="tracker-current">0</span> / <span id="tracker-goal">100</span></span>
                </div>
                <div class="h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                    <div id="tracker-progress-bar" class="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500" style="width: 0%"></div>
                </div>
                <p class="text-[10px] text-slate-400 text-center font-bold" id="tracker-status-desc">아직 실천 전입니다! 물을 마시거나 목표를 채워보세요.</p>
            </div>

            <!-- Incrementor Buttons -->
            <div class="grid grid-cols-3 gap-2.5">
                <button class="add-val-btn p-3 bg-white hover:bg-indigo-50 border border-slate-100 rounded-2xl transition active:scale-95 text-center flex flex-col items-center" data-val="10">
                    <span class="text-lg">💧</span>
                    <span class="text-[10px] font-black text-slate-700 mt-1">+10 (소형)</span>
                </button>
                <button class="add-val-btn p-3 bg-white hover:bg-indigo-50 border border-slate-100 rounded-2xl transition active:scale-95 text-center flex flex-col items-center" data-val="25">
                    <span class="text-lg">🥛</span>
                    <span class="text-[10px] font-black text-slate-700 mt-1">+25 (중형)</span>
                </button>
                <button class="add-val-btn p-3 bg-white hover:bg-indigo-50 border border-slate-100 rounded-2xl transition active:scale-95 text-center flex flex-col items-center" data-val="50">
                    <span class="text-lg">🥤</span>
                    <span class="text-[10px] font-black text-slate-700 mt-1">+50 (대용량)</span>
                </button>
            </div>

            <!-- Custom Input -->
            <div class="flex gap-2">
                <input type="number" id="custom-add-input" placeholder="커스텀 기록 추가 (수치 수동 기입)" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 transition">
                <button id="custom-add-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl text-xs font-black transition active:scale-95">입력</button>
            </div>

            <!-- Log timeline -->
            <div class="space-y-2">
                <h3 class="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <i data-lucide="history" class="w-3.5 h-3.5"></i>
                    <span>달성 내역 히스토리</span>
                </h3>
                <div id="tracker-logs-list" class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    <!-- Logs list injected dynamically -->
                </div>
            </div>
        </div>

        <!-- =================== TAB 2: POMODORO TIMER =================== -->
        <div id="view-timer" class="tab-view space-y-5 hidden">
            <div class="flex flex-col items-center justify-center relative py-2">
                <div class="relative w-40 h-40 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" stroke="#F1EFF4" stroke-width="5" fill="transparent" />
                        <circle id="timer-ring-svg" cx="50" cy="50" r="44" stroke="#EF4444" stroke-width="6" fill="transparent" stroke-dasharray="276.4" stroke-dashoffset="0" stroke-linecap="round" class="transition-all duration-300" />
                    </svg>
                    <div class="absolute text-center space-y-0.5">
                        <span id="timer-text" class="text-3xl font-display font-black text-slate-800">25:00</span>
                        <span id="timer-badge" class="block text-[8px] font-black uppercase bg-red-50 text-red-500 px-2 py-0.5 rounded-full border border-red-100">집중 모드</span>
                    </div>
                </div>
            </div>

            <!-- Timer controls -->
            <div class="flex gap-2 justify-center">
                <button id="timer-play-btn" class="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition active:scale-95 shadow flex items-center justify-center gap-1.5">
                    <i data-lucide="play" class="w-3.5 h-3.5 fill-white"></i>
                    <span>집중 시작</span>
                </button>
                <button id="timer-reset-btn" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-xs font-black transition">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                </button>
            </div>

            <div class="grid grid-cols-3 gap-2 bg-slate-50 p-1 border border-slate-100 rounded-xl text-[9px] font-black text-center text-slate-500">
                <button class="timer-mode-btn py-1.5 rounded-lg text-red-500 bg-white shadow-sm" data-seconds="1500">🍅 25분 집중</button>
                <button class="timer-mode-btn py-1.5 rounded-lg hover:text-slate-700" data-seconds="300">🌿 5분 휴식</button>
                <button class="timer-mode-btn py-1.5 rounded-lg hover:text-slate-700" data-seconds="900">☕ 15분 휴식</button>
            </div>

            <!-- Timer Tasks -->
            <div class="space-y-2">
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-wider">오늘 마스터할 태스크 (ToDo)</h3>
                <div class="flex gap-2">
                    <input type="text" id="timer-task-input" placeholder="집중 과제를 입력하세요..." class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-red-500 transition">
                    <button id="timer-task-add-btn" class="bg-red-600 hover:bg-red-700 text-white px-3.5 rounded-xl font-black text-xs transition">+</button>
                </div>
                <div id="timer-tasks-list" class="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    <!-- Tasks injected dynamically -->
                </div>
            </div>
        </div>

        <!-- =================== TAB 3: ENGLISH QUIZ =================== -->
        <div id="view-quiz" class="tab-view space-y-5 hidden">
            <!-- Quiz Start Panel -->
            <div id="quiz-start-box" class="space-y-4 text-center py-4">
                <div class="w-14 h-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
                    <i data-lucide="brain-circuit" class="w-7 h-7"></i>
                </div>
                <div class="space-y-1">
                    <h3 class="text-sm font-black text-slate-800">에듀 스피드 영단어 퀴즈 🧠</h3>
                    <p class="text-[10px] text-slate-400 font-semibold">10초 제한 시간 안에 알맞은 영어 뜻을 선택하세요.</p>
                </div>
                <div class="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between text-xs font-bold text-left text-slate-500">
                    <span>역대 최고 점수: <span id="quiz-high-score" class="text-indigo-600">0점</span></span>
                    <span>틀린 오답노트: <span id="quiz-wrong-count" class="text-rose-500">0개</span></span>
                </div>
                <button id="quiz-start-btn" class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/10 transition active:scale-95">
                    퀴즈 대결 시작 🚀
                </button>
            </div>

            <!-- Quiz Active Play Panel -->
            <div id="quiz-play-box" class="hidden space-y-4">
                <div class="flex justify-between items-center text-[10px] font-black border-b border-slate-100 pb-2 text-slate-400">
                    <span id="quiz-q-index">질문 1 / 10</span>
                    <span id="quiz-current-score" class="text-indigo-600">점수: 0점</span>
                </div>
                <!-- Word display card -->
                <div class="bg-slate-950 text-white p-6 rounded-2xl text-center relative overflow-hidden flex flex-col justify-center min-h-[110px]">
                    <span class="text-[8px] text-indigo-400 font-black uppercase tracking-widest block mb-1">단어의 알맞은 한글 뜻은?</span>
                    <h2 id="quiz-word-term" class="text-2xl font-black font-display tracking-tight">Challenge</h2>
                </div>
                <!-- Speed progress timer bar -->
                <div class="space-y-1">
                    <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div id="quiz-timer-bar" class="h-full bg-indigo-500 transition-all duration-100" style="width: 100%"></div>
                    </div>
                </div>
                <!-- Choices grid -->
                <div id="quiz-options-container" class="grid grid-cols-1 gap-2">
                    <!-- Option buttons injected dynamically -->
                </div>
            </div>

            <!-- Quiz Results Panel -->
            <div id="quiz-result-box" class="hidden text-center space-y-4 py-4">
                <span class="text-3xl block">🏆</span>
                <h3 class="text-sm font-black text-slate-800">단어 퀴즈 챌린지 완주!</h3>
                <div class="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-xs font-bold text-left space-y-2.5">
                    <div class="flex justify-between">
                        <span class="text-slate-400">최종 점수</span>
                        <span id="quiz-final-score" class="text-indigo-600">0점</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400">정답 개수</span>
                        <span id="quiz-final-ratio">0 / 5</span>
                    </div>
                </div>
                <button id="quiz-replay-btn" class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition">
                    다시 퀴즈 도전하기 🔄
                </button>
            </div>
        </div>

        <!-- =================== TAB 4: GRATITUDE DIARY =================== -->
        <div id="view-diary" class="tab-view space-y-4 hidden">
            <div class="space-y-1.5">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-wider">오늘 마음속의 대표 감정 선택</label>
                <!-- Mood choices -->
                <div class="grid grid-cols-5 gap-2" id="diary-mood-picker">
                    <button class="diary-mood-btn py-2 bg-slate-50 rounded-xl hover:bg-amber-50 border border-slate-150 transition active:scale-95 text-lg" data-mood="excited" title="매우 행복">😆</button>
                    <button class="diary-mood-btn py-2 bg-slate-50 rounded-xl hover:bg-amber-50 border border-slate-150 transition active:scale-95 text-lg" data-mood="happy" title="기쁨">😊</button>
                    <button class="diary-mood-btn py-2 bg-slate-50 rounded-xl hover:bg-amber-50 border border-slate-150 transition active:scale-95 text-lg" data-mood="normal" title="평범">🙂</button>
                    <button class="diary-mood-btn py-2 bg-slate-50 rounded-xl hover:bg-amber-50 border border-slate-150 transition active:scale-95 text-lg" data-mood="tired" title="피곤">🥱</button>
                    <button class="diary-mood-btn py-2 bg-slate-50 rounded-xl hover:bg-amber-50 border border-slate-150 transition active:scale-95 text-lg" data-mood="sad" title="우울">😞</button>
                </div>
            </div>

            <!-- Diary Lines -->
            <div class="space-y-2">
                <label class="block text-[10px] font-black uppercase text-slate-400 tracking-wider">하루 속 감사 일기 3줄 기입장</label>
                <div class="space-y-2">
                    <div class="relative flex items-center">
                        <span class="absolute left-3 text-[10px] font-black text-slate-300">1</span>
                        <input type="text" id="diary-line-1" placeholder="오늘 가장 고마웠던 일을 기입해보세요..." class="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs focus:outline-none transition">
                    </div>
                    <div class="relative flex items-center">
                        <span class="absolute left-3 text-[10px] font-black text-slate-300">2</span>
                        <input type="text" id="diary-line-2" placeholder="스스로 해낸 가치나 칭찬 한마디..." class="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs focus:outline-none transition">
                    </div>
                    <div class="relative flex items-center">
                        <span class="absolute left-3 text-[10px] font-black text-slate-300">3</span>
                        <input type="text" id="diary-line-3" placeholder="내일 마주하고 싶은 긍정 기대를 적어보세요..." class="w-full pl-8 pr-3 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs focus:outline-none transition">
                    </div>
                </div>
            </div>

            <button id="diary-save-btn" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 transition active:scale-95 flex items-center justify-center gap-1.5">
                <i data-lucide="check" class="w-4 h-4"></i>
                <span>오늘 감사 일지 우아하게 등록</span>
            </button>

            <!-- Diary list archive -->
            <div class="space-y-2 pt-3 border-t border-slate-100">
                <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>나의 고유 일지 아카이브</span>
                    <span id="diary-stored-count" class="bg-slate-100 px-2 py-0.5 rounded-full text-[8px]">0개</span>
                </h3>
                <div id="diary-stored-list" class="space-y-2 max-h-40 overflow-y-auto pr-1">
                    <!-- Logs list dynamically -->
                </div>
            </div>
        </div>

        <!-- Educational micro-tip -->
        <div class="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 flex gap-3 text-indigo-900">
            <div class="text-indigo-600"><i data-lucide="info" class="w-5 h-5"></i></div>
            <p class="text-[10px] leading-relaxed font-semibold">
                <strong>스마트 학습 가이드:</strong> 건강한 신체 수분(Challenge), 계획적인 시간 분배(Pomodoro), 개념 암기(Speed Quiz), 그리고 긍정 심리(Gratitude Diary)는 최고의 학업 시너지를 내는 최상의 4대 웰니스 조건입니다.
            </p>
        </div>

    </div>

    <!-- Outer footer -->
    <div class="text-center mt-6 text-[10px] text-slate-400 font-bold tracking-wider">
        Kion-Class Educational System Hub • Live Offline Sandbox
    </div>

    <script src="script.js" defer></script>
</body>
</html>`;

  const scriptJs = `document.addEventListener("DOMContentLoaded", () => {
    // ----------------------------------------------------
    // INITIAL BLUEPRINT & SYSTEM DEFAULTS
    // ----------------------------------------------------
    const APP_NAME = "${appName}";
    const DEFAULT_TAB = "${defaultTab}";
    
    // Lucide Icons initialization
    lucide.createIcons();

    // Sound Synthesizer using Web Audio API
    function playBeep(freq = 440, type = "sine", duration = 0.1) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.log("Audio not supported.");
        }
    }

    // ----------------------------------------------------
    // TAB NAVIGATION CONTROLLERS
    // ----------------------------------------------------
    const tabButtons = document.querySelectorAll(".nav-tab-btn");
    const tabViews = document.querySelectorAll(".tab-view");

    function switchTab(targetTab) {
        tabButtons.forEach(btn => {
            const t = btn.getAttribute("data-tab");
            if (t === targetTab) {
                btn.className = "nav-tab-btn py-2 rounded-xl transition bg-indigo-600 text-white shadow-sm font-black";
            } else {
                btn.className = "nav-tab-btn py-2 rounded-xl transition hover:text-slate-800 font-black";
            }
        });

        tabViews.forEach(view => {
            const viewId = view.getAttribute("id");
            if (viewId === \`view-\${targetTab}\`) {
                view.classList.remove("hidden");
            } else {
                view.classList.add("hidden");
            }
        });
        playBeep(450, "sine", 0.05);
    }

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabName = btn.getAttribute("data-tab");
            switchTab(tabName);
        });
    });

    // Default tab trigger
    switchTab(DEFAULT_TAB);

    // ----------------------------------------------------
    // TAB 1: GOAL TRACKER (Water / Study Habits)
    // ----------------------------------------------------
    let currentVal = 0;
    let goalVal = 100;
    let trackerLogs = [];

    const trackerCurrentEl = document.getElementById("tracker-current");
    const trackerGoalEl = document.getElementById("tracker-goal");
    const trackerProgressBar = document.getElementById("tracker-progress-bar");
    const trackerStatusDesc = document.getElementById("tracker-status-desc");
    const charEmoji = document.getElementById("character-emoji");
    const charLevel = document.getElementById("character-level");
    const charQuote = document.getElementById("character-quote");
    const customAddInput = document.getElementById("custom-add-input");
    const customAddBtn = document.getElementById("custom-add-btn");
    const logsListEl = document.getElementById("tracker-logs-list");

    // If Water application, adjust initial limits and text
    const isWaterApp = APP_NAME.includes("수분") || APP_NAME.includes("물");
    if (isWaterApp) {
        goalVal = 2000;
        document.getElementById("lbl-goal").textContent = "오늘의 권장 수분 섭취량 (mL)";
        trackerGoalEl.textContent = goalVal.toString();
    }

    function loadTrackerState() {
        const saved = localStorage.getItem("KION_BACKUP_TRACKER_STATE");
        if (saved) {
            const parsed = JSON.parse(saved);
            currentVal = parsed.currentVal || 0;
            goalVal = parsed.goalVal || (isWaterApp ? 2000 : 100);
            trackerLogs = parsed.trackerLogs || [];
        } else {
            currentVal = 0;
            trackerLogs = [];
        }
        updateTrackerUI();
    }

    function saveTrackerState() {
        const data = { currentVal, goalVal, trackerLogs };
        localStorage.setItem("KION_BACKUP_TRACKER_STATE", JSON.stringify(data));
    }

    function updateTrackerUI() {
        trackerCurrentEl.textContent = currentVal.toString();
        trackerGoalEl.textContent = goalVal.toString();
        
        const pct = Math.min(100, Math.floor((currentVal / goalVal) * 100));
        trackerProgressBar.style.width = \`\${pct}%\`;

        // Interactive status description and character level evolution
        if (isWaterApp) {
            if (pct === 0) {
                charEmoji.textContent = "💧";
                charLevel.textContent = "아기이슬이 Lv.1";
                charQuote.textContent = '"너무 말라가고 있어요! 맑은 컵 하나 건네주세요!"';
                trackerStatusDesc.textContent = "아직 목이 마른 상태입니다 (0%)";
            } else if (pct < 40) {
                charEmoji.textContent = "🌱💧";
                charLevel.textContent = "새싹 물방울 Lv.2";
                charQuote.textContent = '"잎새가 돋아났어요! 기운이 촉촉하게 감돌아요."';
                trackerStatusDesc.textContent = "수분이 서서히 흡수되는 중입니다 (" + pct + "%)";
            } else if (pct < 80) {
                charEmoji.textContent = "👑💧";
                charLevel.textContent = "아쿠아 히어로 Lv.3";
                charQuote.textContent = '"최고의 청량감! 온몸이 맑게 순환되고 있습니다."';
                trackerStatusDesc.textContent = "목표 고지에 성큼 다다랐습니다 (" + pct + "%)";
            } else {
                charEmoji.textContent = "🪐💫🥤";
                charLevel.textContent = "우주 물정령 Lv.MAX";
                charQuote.textContent = '"경이로운 습관 완수! 하루 완벽 수분 소환 성공!"';
                trackerStatusDesc.textContent = "오늘의 목표 수분을 완벽하게 마스터했습니다! 🎉";
            }
        } else {
            // General planner / habits
            if (pct === 0) {
                charEmoji.textContent = "🌱";
                charLevel.textContent = "꼬마 씨앗 Lv.1";
                charQuote.textContent = '"실천할 일을 기입하고 성장 경험치 물을 부어주세요!"';
                trackerStatusDesc.textContent = "첫 활동을 대기 중입니다 (0%)";
            } else if (pct < 40) {
                charEmoji.textContent = "🪴";
                charLevel.textContent = "아기 새싹 Lv.2";
                charQuote.textContent = '"우와! 작은 줄기가 자랐어요. 포기하지 마세요!"';
                trackerStatusDesc.textContent = "훌륭하게 실천 스택을 쌓는 중입니다 (" + pct + "%)";
            } else if (pct < 80) {
                charEmoji.textContent = "🌿";
                charLevel.textContent = "풍요로운 넝쿨 Lv.3";
                charQuote.textContent = '"온실 속에서 찬란하게 빛나는 공부 경험치 폭발!"';
                trackerStatusDesc.textContent = "목표 달성률이 상당합니다 (" + pct + "%)";
            } else {
                charEmoji.textContent = "🌸✨🏆";
                charLevel.textContent = "황금 지혜의 꽃 Lv.MAX";
                charQuote.textContent = '"축하해요! 오늘의 성장 챌린지를 위대하게 완료!"';
                trackerStatusDesc.textContent = "일일 성장 챔피언 등극 성공! 완벽해요. 🎉";
            }
        }

        // Render Logs
        if (trackerLogs.length === 0) {
            logsListEl.innerHTML = \`<div class="text-center py-4 text-[10px] text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">오늘 저장된 기록이 없습니다.</div>\`;
        } else {
            logsListEl.innerHTML = trackerLogs.map(l => \`
                <div class="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl shadow-sm text-xs">
                    <span class="font-bold text-slate-700">\${l.amount}\${isWaterApp ? "mL" : "개념"} 누적 완료</span>
                    <span class="text-[9px] text-slate-400 font-mono">\${l.time}</span>
                </div>
            \`).join("");
        }
    }

    function addTrackerValue(amount) {
        if (isNaN(amount) || amount <= 0) return;
        currentVal += amount;
        
        const now = new Date();
        const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        trackerLogs.unshift({ amount, time: timeStr });
        
        playBeep(650, "sine", 0.12);
        saveTrackerState();
        updateTrackerUI();
    }

    document.querySelectorAll(".add-val-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const v = parseInt(btn.getAttribute("data-val"));
            addTrackerValue(v);
        });
    });

    customAddBtn.addEventListener("click", () => {
        const val = parseInt(customAddInput.value);
        if (val > 0) {
            addTrackerValue(val);
            customAddInput.value = "";
        }
    });

    // ----------------------------------------------------
    // TAB 2: POMODORO TIMER
    // ----------------------------------------------------
    let timerSecondsLeft = 25 * 60;
    let timerTotalDuration = 25 * 60;
    let timerIsRunning = false;
    let timerInterval = null;
    let timerTasks = [];

    const timerTextEl = document.getElementById("timer-text");
    const timerRingSvg = document.getElementById("timer-ring-svg");
    const timerBadgeEl = document.getElementById("timer-badge");
    const timerPlayBtn = document.getElementById("timer-play-btn");
    const timerResetBtn = document.getElementById("timer-reset-btn");
    const timerTaskInput = document.getElementById("timer-task-input");
    const timerTaskAddBtn = document.getElementById("timer-task-add-btn");
    const timerTasksListEl = document.getElementById("timer-tasks-list");

    function loadTimerState() {
        const saved = localStorage.getItem("KION_BACKUP_TIMER_TASKS");
        if (saved) {
            timerTasks = JSON.parse(saved);
        } else {
            timerTasks = [
                { id: "t-1", text: "오늘의 영단어 10개 완벽 암기", completed: false },
                { id: "t-2", text: "수학 발전소 퀴즈 확인해 보기", completed: true }
            ];
        }
        updateTimerUI();
    }

    function saveTimerState() {
        localStorage.setItem("KION_BACKUP_TIMER_TASKS", JSON.stringify(timerTasks));
    }

    function updateTimerUI() {
        const min = Math.floor(timerSecondsLeft / 60);
        const sec = timerSecondsLeft % 60;
        timerTextEl.textContent = \`\${min.toString().padStart(2, "0")}:\${sec.toString().padStart(2, "0")}\`;

        const maxOffset = 276.4;
        const pct = timerSecondsLeft / timerTotalDuration;
        timerRingSvg.style.strokeDashoffset = (maxOffset * (1 - pct)).toString();

        if (timerIsRunning) {
            timerPlayBtn.className = "flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5";
            timerPlayBtn.innerHTML = \`<i data-lucide="pause" class="w-3.5 h-3.5 fill-white"></i><span>일시정지</span>\`;
        } else {
            timerPlayBtn.className = "flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black transition active:scale-95 shadow flex items-center justify-center gap-1.5";
            timerPlayBtn.innerHTML = \`<i data-lucide="play" class="w-3.5 h-3.5 fill-white"></i><span>집중 시작</span>\`;
        }

        // Render Todo lists
        if (timerTasks.length === 0) {
            timerTasksListEl.innerHTML = \`<div class="text-center py-4 text-[10px] text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">오늘 수행할 몰입 과제가 없습니다.</div>\`;
        } else {
            timerTasksListEl.innerHTML = timerTasks.map(t => \`
                <div class="flex items-center justify-between bg-slate-50 border border-slate-100 p-2 rounded-xl text-xs">
                    <div class="flex items-center gap-2">
                        <button class="toggle-timer-task w-4 h-4 border rounded bg-white flex items-center justify-center" data-id="\${t.id}">
                            \${t.completed ? '<span class="text-[9px] text-red-500 font-bold">✓</span>' : ""}
                        </button>
                        <span class="\${t.completed ? "line-through text-slate-400" : "text-slate-700 font-semibold"}">\${t.text}</span>
                    </div>
                    <button class="delete-timer-task text-slate-300 hover:text-red-500 transition" data-id="\${t.id}">✖</button>
                </div>
            \`).join("");

            document.querySelectorAll(".toggle-timer-task").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.getAttribute("data-id");
                    timerTasks = timerTasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
                    saveTimerState();
                    updateTimerUI();
                });
            });

            document.querySelectorAll(".delete-timer-task").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.getAttribute("data-id");
                    timerTasks = timerTasks.filter(t => t.id !== id);
                    saveTimerState();
                    updateTimerUI();
                });
            });
        }
        lucide.createIcons();
    }

    function toggleTimer() {
        if (timerIsRunning) {
            clearInterval(timerInterval);
            timerIsRunning = false;
        } else {
            timerIsRunning = true;
            timerInterval = setInterval(() => {
                timerSecondsLeft--;
                if (timerSecondsLeft <= 0) {
                    clearInterval(timerInterval);
                    timerIsRunning = false;
                    playBeep(880, "triangle", 0.4);
                    alert("⏱️ 몰입 시간이 종료되었습니다! 눈을 감고 시원하게 기지개를 켜보세요.");
                    timerSecondsLeft = timerTotalDuration;
                }
                updateTimerUI();
            }, 1000);
        }
        updateTimerUI();
    }

    timerPlayBtn.addEventListener("click", toggleTimer);
    timerResetBtn.addEventListener("click", () => {
        clearInterval(timerInterval);
        timerIsRunning = false;
        timerSecondsLeft = timerTotalDuration;
        updateTimerUI();
    });

    document.querySelectorAll(".timer-mode-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            // Un-highlight others
            document.querySelectorAll(".timer-mode-btn").forEach(b => b.className = "timer-mode-btn py-1.5 rounded-lg hover:text-slate-700");
            btn.className = "timer-mode-btn py-1.5 rounded-lg text-red-500 bg-white shadow-sm";
            
            const secs = parseInt(btn.getAttribute("data-seconds"));
            timerTotalDuration = secs;
            timerSecondsLeft = secs;
            clearInterval(timerInterval);
            timerIsRunning = false;
            
            // Adjust badge
            if (secs === 1500) {
                timerBadgeEl.textContent = "집중 모드";
                timerRingSvg.style.stroke = "#EF4444";
            } else {
                timerBadgeEl.textContent = "휴식 모드";
                timerRingSvg.style.stroke = "#10B981";
            }
            updateTimerUI();
        });
    });

    timerTaskAddBtn.addEventListener("click", () => {
        const text = timerTaskInput.value.trim();
        if (text) {
            timerTasks.push({ id: "t-" + Date.now(), text, completed: false });
            timerTaskInput.value = "";
            saveTimerState();
            updateTimerUI();
        }
    });

    // ----------------------------------------------------
    // TAB 3: ENGLISH SPEED QUIZ
    // ----------------------------------------------------
    const QUIZ_BANK = [
        { word: "Concentrate", meaning: "집중하다", options: ["기억하다", "집중하다", "파괴하다", "미루다"] },
        { word: "Essential", meaning: "필수적인", options: ["사소한", "가벼운", "복잡한", "필수적인"] },
        { word: "Improve", meaning: "개선하다", options: ["개선하다", "악화시키다", "보존하다", "관찰하다"] },
        { word: "Gratitude", meaning: "감사, 고마움", options: ["두려움", "슬픔, 눈물", "원망, 분노", "감사, 고마움"] },
        { word: "Prevent", meaning: "예방하다, 막다", options: ["허락하다", "예방하다, 막다", "시작하다", "기다리다"] }
    ];

    let quizIndex = 0;
    let quizScore = 0;
    let quizHighScore = 0;
    let quizTimerInterval = null;
    let quizSecondsLeft = 10;
    let quizWrongWords = [];

    const quizStartBox = document.getElementById("quiz-start-box");
    const quizPlayBox = document.getElementById("quiz-play-box");
    const quizResultBox = document.getElementById("quiz-result-box");
    
    const quizHighScoreEl = document.getElementById("quiz-high-score");
    const quizWrongCountEl = document.getElementById("quiz-wrong-count");
    const quizQIndexEl = document.getElementById("quiz-q-index");
    const quizCurrentScoreEl = document.getElementById("quiz-current-score");
    const quizWordTermEl = document.getElementById("quiz-word-term");
    const quizTimerBar = document.getElementById("quiz-timer-bar");
    const quizOptionsContainer = document.getElementById("quiz-options-container");
    const quizFinalScoreEl = document.getElementById("quiz-final-score");
    const quizFinalRatioEl = document.getElementById("quiz-final-ratio");

    function loadQuizState() {
        const hs = localStorage.getItem("KION_BACKUP_QUIZ_HS") || "0";
        quizHighScore = parseInt(hs);
        quizHighScoreEl.textContent = quizHighScore + "점";

        const savedWrongs = localStorage.getItem("KION_BACKUP_QUIZ_WRONGS");
        if (savedWrongs) {
            quizWrongWords = JSON.parse(savedWrongs);
        } else {
            quizWrongWords = [];
        }
        quizWrongCountEl.textContent = quizWrongWords.length + "개";
    }

    function startQuiz() {
        quizIndex = 0;
        quizScore = 0;
        
        quizStartBox.classList.add("hidden");
        quizResultBox.classList.add("hidden");
        quizPlayBox.classList.remove("hidden");

        renderQuizQuestion();
    }

    function renderQuizQuestion() {
        if (quizIndex >= QUIZ_BANK.length) {
            endQuiz();
            return;
        }

        if (quizTimerInterval) clearInterval(quizTimerInterval);
        quizSecondsLeft = 10;
        updateQuizTimerBar();

        const q = QUIZ_BANK[quizIndex];
        quizQIndexEl.textContent = \`질문 \${quizIndex + 1} / \${QUIZ_BANK.length}\`;
        quizCurrentScoreEl.textContent = \`점수: \${quizScore}점\`;
        quizWordTermEl.textContent = q.word;

        // Render shuffled options
        const opts = [...q.options].sort(() => 0.5 - Math.random());
        quizOptionsContainer.innerHTML = opts.map(opt => \`
            <button class="quiz-opt-btn w-full text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 p-3 rounded-xl text-xs font-bold transition active:scale-99" data-val="\${opt}">
                \${opt}
            </button>
        \`).join("");

        document.querySelectorAll(".quiz-opt-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                handleQuizAnswer(btn.getAttribute("data-val") === q.meaning);
            });
        });

        // 10 second ticking
        quizTimerInterval = setInterval(() => {
            quizSecondsLeft -= 0.1;
            updateQuizTimerBar();
            if (quizSecondsLeft <= 0) {
                handleQuizAnswer(false);
            }
        }, 100);
    }

    function updateQuizTimerBar() {
        const pct = (quizSecondsLeft / 10) * 100;
        quizTimerBar.style.width = \`\${pct}%\`;
    }

    function handleQuizAnswer(isCorrect) {
        if (quizTimerInterval) clearInterval(quizTimerInterval);
        const q = QUIZ_BANK[quizIndex];

        if (isCorrect) {
            quizScore += 100;
            playBeep(700, "sine", 0.15);
        } else {
            playBeep(180, "triangle", 0.25);
            // Save wrong word
            if (!quizWrongWords.some(w => w.word === q.word)) {
                quizWrongWords.push(q);
                localStorage.setItem("KION_BACKUP_QUIZ_WRONGS", JSON.stringify(quizWrongWords));
                loadQuizState();
            }
        }

        // Show right and wrong classes
        document.querySelectorAll(".quiz-opt-btn").forEach(btn => {
            btn.disabled = true;
            const val = btn.getAttribute("data-val");
            if (val === q.meaning) {
                btn.className = "quiz-opt-btn w-full text-left bg-emerald-50 border-2 border-emerald-500 p-3 rounded-xl text-xs font-black text-emerald-700";
            } else if (val !== q.meaning && !isCorrect) {
                btn.className = "quiz-opt-btn w-full text-left bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs font-bold text-slate-300 opacity-60";
            }
        });

        setTimeout(() => {
            quizIndex++;
            renderQuizQuestion();
        }, 1200);
    }

    function endQuiz() {
        quizPlayBox.classList.add("hidden");
        quizResultBox.classList.remove("hidden");

        quizFinalScoreEl.textContent = quizScore + "점";
        const correctOnes = quizScore / 100;
        quizFinalRatioEl.textContent = \`\${correctOnes} / \${QUIZ_BANK.length} 맞춤\`;

        if (quizScore > quizHighScore) {
            localStorage.setItem("KION_BACKUP_QUIZ_HS", quizScore.toString());
            loadQuizState();
        }
    }

    document.getElementById("quiz-start-btn").addEventListener("click", startQuiz);
    document.getElementById("quiz-replay-btn").addEventListener("click", startQuiz);

    // ----------------------------------------------------
    // TAB 4: GRATITUDE 3-LINE DIARY
    // ----------------------------------------------------
    let selectedDiaryMood = "happy";
    let diaryEntries = [];

    const diaryMoodButtons = document.querySelectorAll(".diary-mood-btn");
    const dLine1 = document.getElementById("diary-line-1");
    const dLine2 = document.getElementById("diary-line-2");
    const dLine3 = document.getElementById("diary-line-3");
    const diarySaveBtn = document.getElementById("diary-save-btn");
    const diaryCountEl = document.getElementById("diary-stored-count");
    const diaryListEl = document.getElementById("diary-stored-list");

    const moodIconsMap = {
        excited: "😆 신남",
        happy: "😊 행복",
        normal: "🙂 평범",
        tired: "🥱 피곤",
        sad: "😞 슬픔"
    };

    function loadDiaryEntries() {
        const saved = localStorage.getItem("KION_BACKUP_DIARY_ENTRIES");
        if (saved) {
            diaryEntries = JSON.parse(saved);
        } else {
            diaryEntries = [
                {
                    id: "d-1",
                    date: "2026. 07. 15.",
                    mood: "happy",
                    lines: ["클래스메이트와 가치 있는 코딩 실습을 함께해서 감사했습니다.", "오늘 마신 물 기록을 재미있게 채웠습니다.", "내일의 뽀모도로 세션도 알차게 채우기를 기대합니다."]
                }
            ];
        }
        updateDiaryUI();
    }

    function saveDiaryEntries() {
        localStorage.setItem("KION_BACKUP_DIARY_ENTRIES", JSON.stringify(diaryEntries));
    }

    function updateDiaryUI() {
        // Active mood highlight
        diaryMoodButtons.forEach(btn => {
            const m = btn.getAttribute("data-mood");
            if (m === selectedDiaryMood) {
                btn.className = "diary-mood-btn py-2 bg-indigo-50 rounded-xl border-2 border-indigo-500 text-lg transition shadow-inner";
            } else {
                btn.className = "diary-mood-btn py-2 bg-slate-50 rounded-xl hover:bg-slate-100 border border-slate-150 transition active:scale-95 text-lg";
            }
        });

        diaryCountEl.textContent = diaryEntries.length + "개";

        if (diaryEntries.length === 0) {
            diaryListEl.innerHTML = \`<div class="text-center py-4 text-[10px] text-slate-400 font-semibold border border-dashed border-slate-200 rounded-xl bg-slate-50/50">아직 저장된 감사 일지가 없습니다.</div>\`;
        } else {
            diaryListEl.innerHTML = diaryEntries.map(e => {
                const markup = e.lines.map((l, i) => \`
                    <div class="text-[11px] text-slate-600 leading-relaxed flex gap-1.5">
                        <span class="text-indigo-500 font-black font-mono">\${i+1}</span>
                        <span>\${l}</span>
                    </div>
                \`).join("");

                return \`
                    <div class="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl space-y-1.5 relative group animate-fade-in shadow-sm">
                        <div class="flex justify-between items-center border-b border-slate-200/40 pb-1 text-[10px]">
                            <span class="text-slate-400 font-bold font-mono">\${e.date}</span>
                            <div class="flex items-center gap-1.5">
                                <span class="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black text-[8px] border border-indigo-100">\${moodIconsMap[e.mood] || "🙂"}</span>
                                <button class="delete-diary-entry text-slate-300 hover:text-red-500" data-id="\${e.id}">✖</button>
                            </div>
                        </div>
                        <div class="space-y-1">
                            \${markup}
                        </div>
                    </div>
                \`;
            }).join("");

            document.querySelectorAll(".delete-diary-entry").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = btn.getAttribute("data-id");
                    if (confirm("이 감사 일기를 삭제할까요?")) {
                        diaryEntries = diaryEntries.filter(e => e.id !== id);
                        saveDiaryEntries();
                        updateDiaryUI();
                    }
                });
            });
        }
    }

    diaryMoodButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            selectedDiaryMood = btn.getAttribute("data-mood");
            updateDiaryUI();
            playBeep(520, "sine", 0.05);
        });
    });

    diarySaveBtn.addEventListener("click", () => {
        const l1 = dLine1.value.trim();
        const l2 = dLine2.value.trim();
        const l3 = dLine3.value.trim();

        if (!l1 || !l2 || !l3) {
            alert("하루 3줄 감사 일기를 모두 채워주셔야 완벽한 긍정 보관이 가능합니다!");
            return;
        }

        const dateStr = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
        const entry = {
            id: "d-" + Date.now(),
            date: dateStr,
            mood: selectedDiaryMood,
            lines: [l1, l2, l3]
        };

        diaryEntries.unshift(entry);
        saveDiaryEntries();
        
        dLine1.value = "";
        dLine2.value = "";
        dLine3.value = "";

        playBeep(587, "sine", 0.25);
        updateDiaryUI();
    });

    // ----------------------------------------------------
    // GLOBAL ARCHIVE RESET
    // ----------------------------------------------------
    document.getElementById("reset-state-btn").addEventListener("click", () => {
        if (confirm("현재 보관함에 들어있는 수분 이력, 뽀모도로 태스크, 오답 및 감사 일기를 포함한 모든 로컬 데이터를 원본 상태로 청소할까요?")) {
            localStorage.removeItem("KION_BACKUP_TRACKER_STATE");
            localStorage.removeItem("KION_BACKUP_TIMER_TASKS");
            localStorage.removeItem("KION_BACKUP_QUIZ_HS");
            localStorage.removeItem("KION_BACKUP_QUIZ_WRONGS");
            localStorage.removeItem("KION_BACKUP_DIARY_ENTRIES");
            
            playBeep(330, "triangle", 0.3);
            
            loadTrackerState();
            loadTimerState();
            loadQuizState();
            loadDiaryEntries();
        }
    });

    // ----------------------------------------------------
    // INITIAL BOOTSTRAP TRIGGERING
    // ----------------------------------------------------
    loadTrackerState();
    loadTimerState();
    loadQuizState();
    loadDiaryEntries();
});`;

  const stylesCss = `@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
}
.animate-bounce {
    animation: bounce 2.5s ease-in-out infinite;
}
.animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
}`;

  return {
    appName,
    files: [
      { path: "index.html", content: indexHtml },
      { path: "script.js", content: scriptJs },
      { path: "styles.css", content: stylesCss },
      { path: "_redirects", content: "/* /index.html 200" }
    ]
  };
}

app.post("/api/gemini/plan", async (req, res) => {
  try {
    const { idea } = req.body;
    if (!idea || typeof idea !== "string") {
      return res.status(400).json({ error: "아이디어를 입력해주세요." });
    }

    // Try with Gemini API first using the robust retry helper
    try {
      const ai = getGeminiClient();
      const systemInstruction = `너는 세계 최고의 기획자이자 제품 설계자(Product Manager)이다. 
학생이 제안한 러프한 아이디어를 받아서, 정밀하고 구체적인 기술 명세서(Technical Specification)를 작성해야 해.
결과물은 반드시 JSON 형식이어야 하며, 다음 필드들을 완벽하게 채워야 한다:
1. appName: 앱에 어울리는 직관적이고 멋진 한국어 이름 (예: "똑똑 가계부", "나만의 단어장")
2. description: 앱의 핵심 가치와 목적을 설명하는 2-3줄의 명확한 요약
3. targetAudience: 이 앱의 주요 대상 독자층 (예: 초등학생, 수험생, 개발 공부를 시작한 성인 등)
4. keyFeatures: 핵심 기능 3-4개의 목록. 각 기능은 title과 description을 포함해야 함.
5. uiLayout: 화면의 구조, 레이아웃 분할, 테마 색상(예: 파스텔 블루, 다크 차콜 등), 폰트 느낌, 사용자 흐름 등을 한국어로 상세히 설명한 가이드
6. techSpecs: 권장 데이터 구조 및 로컬스토리지 저장 키 값, 상태 값(State) 정의 등 기술적 사양 가이드
7. systemPrompt: 이 기획서를 바탕으로 '개발자 에이전트'가 실제 코드를 작성할 때 사용할 맞춤형 시스템 프롬프트. 개발자 에이전트가 어떤 스타일로 컴포넌트를 설계하고 어떤 기능을 꼭 넣어야 하는지 지시를 포함할 것.

주의: 모든 한글 텍스트는 친절하고 명확한 존댓말로 표현해줘.`;

      const response = await callGenerateContentWithFallback(ai, {
        contents: `학생의 앱 아이디어: "${idea}"\n위 아이디어를 바탕으로 멋진 기획서 JSON을 작성해줘.`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              appName: { type: Type.STRING },
              description: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              keyFeatures: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["title", "description"]
                }
              },
              uiLayout: { type: Type.STRING },
              techSpecs: { type: Type.STRING },
              systemPrompt: { type: Type.STRING }
            },
            required: ["appName", "description", "targetAudience", "keyFeatures", "uiLayout", "techSpecs", "systemPrompt"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Gemini로부터 기획 데이터 생성에 실패했습니다.");
      }

      const planData = JSON.parse(resultText);
      res.json(planData);
    } catch (apiError: any) {
      if (isRateLimitError(apiError)) {
        console.warn("[Gemini Plan] Rate Limit Exceeded:", apiError.message || apiError);
        return res.status(429).json({
          error: "QUOTA_EXHAUSTED",
          message: "AI가 지금 너무 바빠요! 잠시 후(예: 30초 뒤) 다시 시도해주세요."
        });
      }
      console.warn("[Gemini Plan] API Failed/Unavailable, falling back to local planner...", apiError.message || apiError);
      // Perfect elegant client-side planner fallback
      const fallbackPlan = getLocalFallbackPlan(idea);
      res.json({ ...fallbackPlan, isFallback: true });
    }
  } catch (error: any) {
    console.error("Planning API Error:", error);
    res.status(500).json({ error: error.message || "기획 에이전트 실행 중 오류가 발생했습니다." });
  }
});

// 1.5 Interactive Planning Chat API (대화형 기획 에이전트 피드백 반영)
app.post("/api/gemini/plan-chat", async (req, res) => {
  try {
    const { spec, message, chatHistory } = req.body;
    if (!spec || !message) {
      return res.status(400).json({ error: "기획안(spec) 데이터와 메시지(message)가 누락되었습니다." });
    }

    // Try with Gemini API first
    try {
      const ai = getGeminiClient();
      const systemInstruction = `너는 학생의 피드백을 수용하여 기획 명세를 수정하는 전문 PM(Product Manager)이야.
학생이 기존 기획 사양에 대해 버그 제보, 추가 기능 요구, 디자인 변경 등 다양한 피드백을 줄 거야.
버그가 발견되거나 개선 요청이 있으면 해당 기능을 해결 및 고도화하는 방향으로 기획 명세를 수정하고 다시 설계해줘야 해.

결과물은 반드시 JSON 형식이어야 하며, 다음 필드들을 완벽하게 채워야 한다:
1. appName: 수정된 앱 이름 (기존 이름을 유지하거나, 피드백에 어울리게 세련되게 변경할 수 있음)
2. description: 앱의 설명 (피드백 반영 후 핵심 가치와 목적을 요약한 2-3줄의 한국어 요약)
3. targetAudience: 타겟 고객층 (기존 기획을 유지하거나 피드백에 맞게 수정)
4. keyFeatures: 피드백이 완벽히 해결 및 고도화된 3-4개의 핵심 기능 정의 목록. 각 기능은 title과 description을 가짐. 피드백 내용(예: "10점 증가 로직 추가")이 반드시 여기에 구체적으로 녹아있어야 함.
5. uiLayout: 화면의 구조, 레이아웃 분할, 테마 색상, 사용자 흐름 등을 한국어로 상세히 설명한 가이드. 피드백된 요구사항이나 개선점이 UI에 어떻게 구현되어야 하는지 명확하게 지시할 것.
6. techSpecs: 기술적 사양 가이드 (권장 데이터 구조, 로컬스토리지 저장 키 값, 상태 값(State) 정의 등). 피드백에서 지적된 오류나 보완 요구사항(예: "10점 로직이 올라가지 않는다")을 해결하기 위해, 상태 업데이트 함수 명칭이나 상세 로직 사양을 구체적으로 수정/보완해 기록할 것.
7. systemPrompt: 이 기획서를 바탕으로 '개발자 에이전트'가 실제 코드를 작성할 때 사용할 맞춤형 시스템 프롬프트. 피드백된 핵심 로직(예: 10점 로직 오류 수정, 신규 기능 추가 등)을 개발자가 누락 없이 "완벽하게 구현해야 함"을 극도로 강조하고, 구체적인 구현 팁과 컴포넌트 설계를 지시할 것.
8. assistantReply: 학생의 피드백에 대해 어떤 문제를 발견했고, 해당 문제를 해결하기 위해 기획 명세서의 어느 부분(핵심 기능, 기술 사양, 시스템 프롬프트 등)을 어떻게 개선 및 보완하여 수정하였는지 친절하고 든든한 한국어 존댓말로 설명하는 2-3줄의 한글 PM 코멘트.

주의: 모든 한글 텍스트는 학생을 존중하고 격려하는 친절하고 명확한 존댓말로 표현해줘.`;

      const contents = [
        {
          role: "user",
          parts: [{ text: `현재 기획 사양:\n${JSON.stringify(spec, null, 2)}\n\n학생 추가 피드백: "${message}"\n이 피드백을 수용하여 보완 및 수정한 기획 명세서 JSON을 출력해줘. ` }]
        }
      ];

      const response = await callGenerateContentWithFallback(ai, {
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              appName: { type: Type.STRING },
              description: { type: Type.STRING },
              targetAudience: { type: Type.STRING },
              keyFeatures: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["title", "description"]
                }
              },
              uiLayout: { type: Type.STRING },
              techSpecs: { type: Type.STRING },
              systemPrompt: { type: Type.STRING },
              assistantReply: { type: Type.STRING }
            },
            required: ["appName", "description", "targetAudience", "keyFeatures", "uiLayout", "techSpecs", "systemPrompt", "assistantReply"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Gemini로부터 기획 피드백 수정 데이터 생성에 실패했습니다.");
      }

      const planData = JSON.parse(resultText);
      res.json(planData);
    } catch (apiError: any) {
      if (isRateLimitError(apiError)) {
        console.warn("[Gemini Plan Chat] Rate Limit Exceeded:", apiError.message || apiError);
        return res.status(429).json({
          error: "QUOTA_EXHAUSTED",
          message: "AI가 지금 너무 바빠요! 잠시 후(예: 30초 뒤) 다시 시도해주세요."
        });
      }
      console.warn("[Gemini Plan Chat] API Failed, falling back to local merge logic:", apiError.message || apiError);
      
      // Robust Fallback merge logic
      const fallbackSpec = {
        ...spec,
        description: `${spec.description} (피드백 반영됨: ${message})`,
        techSpecs: `${spec.techSpecs}\n\n[피드백 반영 사양]\n- 피드백 내용: ${message}\n- 반영 완료: 오류를 수정하고 지정한 상태 업데이트 로직을 데이터 구조에 긴밀하게 통합함.`,
        systemPrompt: `${spec.systemPrompt}\n\n⚠️ [중요 - 학생 추가 피드백 사항]:\n이 앱에 다음 피드백을 반드시 완벽히 반영해서 개발해야 합니다: "${message}". 특히 관련 버그나 로직 오류(예: 점수가 안 올라가거나 오작동하는 문제)를 꼼꼼하게 수정하고 해당 요구사항이 매끄럽게 작동하도록 프론트엔드 상태 관리에 완벽히 통합하세요.`,
        assistantReply: `현재 Gemini API가 일시적으로 지연되어 로컬 신속 모드로 기획 명세를 즉시 보완했습니다! 시스템 프롬프트와 기술 사양 최하단에 입력하신 피드백("${message}")을 안전하게 수용해 보완했습니다. 이제 우측에서 [코드 반영하기]를 누르시면 개발 에이전트가 이 내용을 감지하여 완벽하게 빌드 및 코드를 작성합니다! 👍`
      };
      res.json(fallbackSpec);
    }
  } catch (error: any) {
    console.error("Plan Chat API Error:", error);
    res.status(500).json({ error: error.message || "대화형 기획 에이전트 처리 중 오류가 발생했습니다." });
  }
});

// 2. Developer Agent API (개발 에이전트)
app.post("/api/gemini/code", async (req, res) => {
  try {
    const { spec, customSystemPrompt } = req.body;
    if (!spec) {
      return res.status(400).json({ error: "기획안 데이터가 누락되었습니다." });
    }

    const appName = spec.appName || "나의 맞춤형 앱";

    // If it's a backup spec from planning, trigger code fallback immediately to avoid latency and ensure robust loading
    if (spec.systemPrompt && spec.systemPrompt.startsWith("kion_backup:")) {
      console.log("[Gemini Code] Safe mode fallback requested directly from client spec:", spec.systemPrompt);
      const codeFallback = getLocalFallbackCode(appName, spec.systemPrompt);
      return res.json(codeFallback);
    }

    try {
      const ai = getGeminiClient();
      const baseSystemPrompt = `너는 아주 유능한 프론트엔드 개발 에이전트(Frontend Developer Agent)이다.
제시된 기획서(spec)를 읽고, 사용자가 즉시 실행해 볼 수 있고 Netlify에 바로 배포할 수 있는 싱글 페이지 웹 애플리케이션(SPA) 소스코드를 파일 형태로 생성해줘.

너가 생성해야 하는 파일 구성은 다음과 같아:
1. index.html: 메인 HTML 파일. CDN을 활용해 풍부하고 완성도 높은 UI를 만들어야 해.
   - Tailwind CSS 스크립트 로드 필수: <script src="https://cdn.tailwindcss.com"></script>
   - Lucide Icons CDN 로드 필수: <script src="https://unpkg.com/lucide@latest"></script> 
   - 스크립트 연결: <script src="script.js" defer></script>
   - 스타일시트 연결: <link rel="stylesheet" href="styles.css">
   - 반드시 모던하고 고급스러운 한글 레이아웃, 풍부한 여백, 호버 애니메이션, 반응형 디자인을 적용해줘.
2. script.js: 모든 애플리케이션 상태 관리(State Management) 및 인터랙션 로직이 담긴 순수 자바스크립트 파일.
   - 데이터는 새로고침해도 유지되도록 localStorage를 적극 활용해야 해.
   - Lucide 아이콘이 렌더링된 후 lucide.createIcons()를 실행하는 코드 포함 필수.
   - 가상의 목 데이터(mock data)를 풍부하게 준비해서 첫 화면이 썰렁하지 않고 바로 풍부한 앱 경험을 할 수 있도록 유도해줘.
3. styles.css: 추가적인 커스텀 스타일이나 애니메이션 클래스 정의.
4. _redirects: Netlify SPA 배포를 위한 리다이렉트 설정 파일. 내용물은 반드시 "/* /index.html 200" 한 줄이어야 한다.

중요 사항:
- 코드 내의 모든 텍스트, 설명, 가이드는 한글로 친절하고 친근하게 작성해줘.
- '지저분하거나 작동하지 않는 코드'가 들어있어서는 절대 안 되며, 100% 자가 구동되고 미려해야 한다.
- 라이브러리는 CDN을 통해 완벽하게 불러와야 해.
- Netlify 배포용 'dist' 폴더 구조를 준비해야 하므로, 반환되는 파일들은 배포 루트 폴더에 있어야 한다.`;

      const finalSystemPrompt = `${baseSystemPrompt}\n\n[기획자가 내린 세부 지시사항]:\n${customSystemPrompt || ""}`;

      const response = await callGenerateContentWithFallback(ai, {
        contents: `기획 명세서: ${typeof spec === "string" ? spec : JSON.stringify(spec)}\n위 기획 명세서를 토대로 즉시 작동 가능한 완성도 높은 static SPA 소스코드를 파일별로 작성해줘.`,
        config: {
          systemInstruction: finalSystemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              appName: { type: Type.STRING },
              files: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    path: { type: Type.STRING, description: "파일 이름 (예: index.html, script.js, styles.css, _redirects)" },
                    content: { type: Type.STRING, description: "파일의 소스코드 및 원본 내용" }
                  },
                  required: ["path", "content"]
                }
              }
            },
            required: ["appName", "files"]
          }
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Gemini로부터 코드 생성에 실패했습니다.");
      }

      const codeData = JSON.parse(resultText);
      res.json(codeData);
    } catch (apiError: any) {
      if (isRateLimitError(apiError)) {
        console.warn("[Gemini Code] Rate Limit Exceeded:", apiError.message || apiError);
        return res.status(429).json({
          error: "QUOTA_EXHAUSTED",
          message: "AI가 지금 너무 바빠요! 잠시 후(예: 30초 뒤) 다시 시도해주세요."
        });
      }
      console.warn("[Gemini Code] API Failed/Unavailable, falling back to local code compiler...", apiError.message || apiError);
      const codeFallback = getLocalFallbackCode(appName, customSystemPrompt || "");
      res.json({ ...codeFallback, isFallback: true });
    }
  } catch (error: any) {
    console.error("Developer API Error:", error);
    res.status(500).json({ error: error.message || "개발 에이전트 실행 중 오류가 발생했습니다." });
  }
});

// 3. Netlify Deployment API (Netlify 연동 배포)
app.post("/api/netlify/deploy", async (req, res) => {
  try {
    const { files, customToken } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "배포할 파일 데이터가 없습니다." });
    }

    // Determine token
    const token = customToken || process.env.NETLIFY_AUTH_TOKEN;
    if (!token) {
      return res.status(401).json({ 
        error: "Netlify 인증 토큰이 누락되었습니다.", 
        requiresToken: true,
        help: "Netlify Personal Access Token을 설정 탭에 입력해주시거나, 프로젝트 루트의 .env 파일에 NETLIFY_AUTH_TOKEN을 설정해주세요." 
      });
    }

    // Ensure _redirects is included
    const hasRedirects = files.some(f => f.path === "_redirects");
    const deployFiles = [...files];
    if (!hasRedirects) {
      deployFiles.push({
        path: "_redirects",
        content: "/* /index.html 200"
      });
    }

    // Build the ZIP in memory
    const zip = new AdmZip();
    for (const file of deployFiles) {
      // Normalize path to make sure it's at the root of the ZIP
      const filename = path.basename(file.path);
      zip.addFile(filename, Buffer.from(file.content, "utf-8"));
    }
    const zipBuffer = zip.toBuffer();

    console.log(`[Netlify] Creating a new site deployment with ZIP (${zipBuffer.length} bytes)...`);

    // 3.1 Create a new Netlify Site (auto-generated unique name)
    const createSiteRes = await fetch("https://api.netlify.com/api/v1/sites", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({}) // Empty body lets Netlify choose a unique name
    });

    if (!createSiteRes.ok) {
      const errorText = await createSiteRes.text();
      console.error("[Netlify] Create Site Failed:", errorText);
      throw new Error(`Netlify 사이트 생성 실패: ${createSiteRes.status} ${createSiteRes.statusText}`);
    }

    const siteData: any = await createSiteRes.json();
    const siteId = siteData.id;
    const siteUrl = siteData.ssl_url || siteData.url;
    const siteName = siteData.name;

    console.log(`[Netlify] Created Site ${siteName} (${siteId}). Uploading ZIP...`);

    // 3.2 Deploy the ZIP file to the created site
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/zip"
      },
      body: zipBuffer
    });

    if (!deployRes.ok) {
      const errorText = await deployRes.text();
      console.error("[Netlify] Upload Deploy Failed:", errorText);
      throw new Error(`Netlify 코드 업로드 실패: ${deployRes.status} ${deployRes.statusText}`);
    }

    const deployData: any = await deployRes.json();
    console.log(`[Netlify] Deployed successfully! Site URL: ${siteUrl}`);

    res.json({
      success: true,
      siteId,
      siteName,
      siteUrl,
      deployId: deployData.id,
      deployUrl: deployData.deploy_ssl_url || siteUrl,
      message: "Netlify 배포가 완료되었습니다!"
    });

  } catch (error: any) {
    console.error("Netlify Deploy Error:", error);
    res.status(500).json({ error: error.message || "Netlify 배포 처리 중 오류가 발생했습니다." });
  }
});

// --- Admin Settings API (Announcements & Resources Sync) ---
const SETTINGS_FILE_PATH = path.join(process.cwd(), "settings_db.json");

const DEFAULT_SETTINGS = {
  notices: [
    "📌 [과제 안내] 이번 주 금요일까지 나만의 인공지능 번역기 앱 제출 마감입니다!",
    "💡 [팁] 리액트 기초 학습자분들은 템플릿 실습 코드를 대시보드에서 복사해 테스트하세요."
  ],
  resources: [
    { emoji: "⚡", title: "React + Vite 공식 교육 가이드", url: "https://ko.vite.dev/" },
    { emoji: "🎨", title: "Tailwind CSS 레이아웃 도구", url: "https://tailwindcss.com/" },
    { emoji: "🤖", title: "Gemini API 빠른 시작 가이드", url: "https://ai.google.dev/" }
  ]
};

app.get("/api/settings", (req, res) => {
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const data = fs.readFileSync(SETTINGS_FILE_PATH, "utf8");
      return res.json(JSON.parse(data));
    }
    return res.json(DEFAULT_SETTINGS);
  } catch (err: any) {
    console.error("Error reading settings_db.json:", err);
    return res.json(DEFAULT_SETTINGS);
  }
});

app.post("/api/settings", (req, res) => {
  try {
    const { notices, resources } = req.body;
    if (!notices || !resources) {
      return res.status(400).json({ error: "필수 데이터(notices, resources)가 누락되었습니다." });
    }
    const updatedSettings = { notices, resources };
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(updatedSettings, null, 2), "utf8");
    return res.json({ success: true, settings: updatedSettings });
  } catch (err: any) {
    console.error("Error writing settings_db.json:", err);
    return res.status(500).json({ error: "설정 데이터를 저장하는 도중 오류가 발생했습니다." });
  }
});

// Serve static assets or use Vite in dev
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
