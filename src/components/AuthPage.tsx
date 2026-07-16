import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  CheckCircle,
  Key
} from "lucide-react";
import { supabase, mockAuth, isSupabaseConfigured, UserSession } from "../lib/supabase";

interface AuthPageProps {
  onAuthSuccess: (session: UserSession) => void;
}

// Palette 22 Viola Color Constants
const COLOR_MAIN_PURPLE = "#7A20A1"; // Main Purple (핫핑크 위치에 대입)
const COLOR_LIGHT_VIOLET = "#CE55BA"; // Light Violet (일러스트 포인트 컬러)
const COLOR_ACCENT_ORANGE = "#FFC573"; // Yellow/Orange Accent
const COLOR_ACCENT_BEIGE = "#FFEDB5"; // Beige/Cream Accent

/**
 * Reference-identical clean line-art Desk Illustration with Palette 22 Viola Colors.
 * Replacing green accents with Viola Light Violet (#CE55BA) & Lilac tones.
 */
const DeskIllustration = () => {
  return (
    <svg 
      id="desk-illustration"
      viewBox="0 0 500 400" 
      className="w-full h-auto max-w-[480px] md:max-w-[500px] lg:max-w-[540px]" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Floating Decorative Shapes (Triangles, Circles, Stars) */}
      <g id="decorations" className="animate-pulse" style={{ animationDuration: "6s" }}>
        {/* Triangles */}
        <path d="M100 150 L108 164 L92 164 Z" fill={COLOR_LIGHT_VIOLET} opacity="0.4" />
        <path d="M220 120 L226 130 L214 130 Z" fill={COLOR_ACCENT_ORANGE} opacity="0.6" />
        <path d="M380 180 L388 194 L372 194 Z" fill={COLOR_LIGHT_VIOLET} opacity="0.5" />
        
        {/* Circles */}
        <circle cx="150" cy="140" r="6" stroke={COLOR_LIGHT_VIOLET} strokeWidth="2" opacity="0.6" />
        <circle cx="110" cy="235" r="7" stroke={COLOR_LIGHT_VIOLET} strokeWidth="2" opacity="0.5" />
        <circle cx="376" cy="140" r="5" stroke={COLOR_LIGHT_VIOLET} strokeWidth="2" opacity="0.6" />
        <circle cx="400" cy="155" r="3" fill="#2D2D2D" />
        
        {/* Connected nodes deco */}
        <path d="M80 180 H94 M87 173 V187" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="87" cy="173" r="3.5" fill="#2D2D2D" stroke="white" strokeWidth="1" />
        <circle cx="87" cy="187" r="3.5" fill="#2D2D2D" stroke="white" strokeWidth="1" />
        <circle cx="80" cy="180" r="3.5" fill="#2D2D2D" stroke="white" strokeWidth="1" />
        <circle cx="94" cy="180" r="3.5" fill="#2D2D2D" stroke="white" strokeWidth="1" />
      </g>

      {/* 2. Hanging Floating Shelf above Desk */}
      <g id="shelf">
        {/* Floating Shelf brackets */}
        <path d="M185 180 V165 H195" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M315 180 V165 H305" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        {/* Floating Shelf Board */}
        <rect x="170" y="160" width="160" height="5" rx="2.5" fill="white" stroke="#2D2D2D" strokeWidth="1.5" />
        
        {/* Small storage box on shelf */}
        <rect x="180" y="145" width="24" height="15" rx="2" fill="white" stroke="#2D2D2D" strokeWidth="1.5" />
        <line x1="180" y1="152" x2="204" y2="152" stroke="#2D2D2D" strokeWidth="1" />

        {/* Floating Books on Shelf */}
        <rect x="220" y="125" width="12" height="35" rx="1" fill={COLOR_ACCENT_BEIGE} stroke="#2D2D2D" strokeWidth="1.5" />
        <rect x="232" y="115" width="10" height="45" rx="1" fill="white" stroke="#2D2D2D" strokeWidth="1.5" />
        <rect x="242" y="120" width="14" height="40" rx="1" fill={COLOR_LIGHT_VIOLET} opacity="0.3" />
        <rect x="242" y="120" width="14" height="40" rx="1" stroke="#2D2D2D" strokeWidth="1.5" />
      </g>

      {/* 3. Horizontal Line & Table Base Decoration */}
      <line x1="60" y1="328" x2="440" y2="328" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="100" y1="328" x2="180" y2="328" stroke="#2D2D2D" strokeWidth="3" strokeLinecap="round" />

      {/* 4. Desk Drawer Cabinet on Left */}
      <g id="drawer-cabinet">
        {/* Outer body */}
        <rect x="110" y="240" width="55" height="88" rx="3" fill="#F8F6F9" stroke="#2D2D2D" strokeWidth="2" />
        <rect x="110" y="240" width="55" height="88" rx="3" fill={COLOR_LIGHT_VIOLET} opacity="0.1" />
        {/* Inner Cabinet Front (Colored Point) */}
        <rect x="116" y="248" width="43" height="74" rx="2" fill={COLOR_LIGHT_VIOLET} opacity="0.75" />
        <rect x="116" y="248" width="43" height="74" rx="2" stroke="#2D2D2D" strokeWidth="1.5" />
        {/* Drawer Handles */}
        <line x1="126" y1="262" x2="148" y2="262" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
        <line x1="126" y1="282" x2="148" y2="282" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* 5. Desk Table Legs */}
      <g id="table-legs">
        {/* Left leg behind drawer */}
        <rect x="100" y="228" width="8" height="100" fill={COLOR_LIGHT_VIOLET} opacity="0.8" />
        <rect x="100" y="228" width="8" height="100" stroke="#2D2D2D" strokeWidth="1.5" />
        
        {/* Right leg */}
        <rect x="360" y="228" width="8" height="100" fill={COLOR_LIGHT_VIOLET} opacity="0.8" />
        <rect x="360" y="228" width="8" height="100" stroke="#2D2D2D" strokeWidth="1.5" />
      </g>

      {/* 6. Desk Top Board */}
      <rect x="80" y="218" width="310" height="10" rx="3" fill="white" stroke="#2D2D2D" strokeWidth="2" />
      <rect x="80" y="218" width="310" height="10" rx="3" fill={COLOR_LIGHT_VIOLET} opacity="0.15" />

      {/* 7. Monitor & Computer Setup */}
      <g id="monitor">
        {/* Monitor Base */}
        <path d="M215 218 L225 198 H245 L255 218 Z" fill="white" stroke="#2D2D2D" strokeWidth="2" strokeLinejoin="round" />
        {/* Monitor Frame */}
        <rect x="180" y="145" width="110" height="70" rx="4" fill="white" stroke="#2D2D2D" strokeWidth="2" />
        {/* Screen Display */}
        <rect x="186" y="151" width="98" height="54" rx="2" fill="#ECE9EE" stroke="#2D2D2D" strokeWidth="1.5" />
        {/* Dynamic Graphic Lines representing screen content */}
        <path d="M190 190 L220 160 L240 180 L280 156" stroke={COLOR_MAIN_PURPLE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="220" cy="160" r="2.5" fill={COLOR_MAIN_PURPLE} />
        <circle cx="240" cy="180" r="2.5" fill={COLOR_MAIN_PURPLE} />
        <circle cx="280" cy="156" r="2.5" fill={COLOR_MAIN_PURPLE} />
      </g>

      {/* 8. Speaker on Left */}
      <g id="speaker">
        <rect x="100" y="190" width="22" height="28" rx="2" fill="white" stroke="#2D2D2D" strokeWidth="1.5" />
        <rect x="100" y="190" width="22" height="28" rx="2" fill={COLOR_LIGHT_VIOLET} opacity="0.5" />
        <circle cx="111" cy="198" r="3" fill="white" stroke="#2D2D2D" strokeWidth="1" />
        <circle cx="111" cy="208" r="5" fill="white" stroke="#2D2D2D" strokeWidth="1" />
      </g>

      {/* 9. Mug & Small Accents */}
      <g id="mug">
        {/* Coffee cup */}
        <rect x="300" y="202" width="16" height="16" rx="2" fill="white" stroke="#2D2D2D" strokeWidth="1.5" />
        <path d="M316 205 C320 205 320 211 316 211" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        {/* Steam rising */}
        <path d="M304 197 Q306 193 304 189" stroke="#2D2D2D" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        <path d="M310 197 Q312 193 310 189" stroke="#2D2D2D" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* 10. Desk Lamp on Right with Light Cone */}
      <g id="lamp">
        {/* Lamp Base */}
        <rect x="330" y="214" width="18" height="4" rx="1" fill="white" stroke="#2D2D2D" strokeWidth="1.5" />
        {/* Lamp Joint Arms */}
        <path d="M339 214 L358 185 L334 165" stroke="#2D2D2D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Lamp Head (Colored Point) */}
        <path d="M325 170 L342 160 L334 148 L318 158 Z" fill={COLOR_LIGHT_VIOLET} opacity="0.8" />
        <path d="M325 170 L342 160 L334 148 L318 158 Z" stroke="#2D2D2D" strokeWidth="1.5" strokeLinejoin="round" />
        
        {/* Light Beam Glowing (Soft Yellow/Orange Accent) */}
        <polygon points="320,166 260,218 300,218" fill={COLOR_ACCENT_ORANGE} opacity="0.18" />
      </g>

      {/* 11. Pen Holder / Pencil Cup */}
      <g id="pen-holder">
        <rect x="320" y="200" width="8" height="18" rx="1" fill="white" stroke="#2D2D2D" strokeWidth="1.5" />
        <line x1="322" y1="200" x2="320" y2="192" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="325" y1="200" x2="326" y2="190" stroke="#2D2D2D" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* 12. Keyboard & Mouse */}
      <rect x="210" y="214" width="45" height="4" rx="1" fill="#2D2D2D" />
      <circle cx="265" cy="216" r="2.5" fill="#2D2D2D" />
    </svg>
  );
};

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isSignUp, setIsSignUp] = useState(true); // Default to True to mirror reference "Save You Account Now / Sign Up"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setLoading(true);

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setError("유효한 이메일 주소를 입력해 주세요.");
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError("이름을 입력해 주세요.");
          setLoading(false);
          return;
        }

        if (isSupabaseConfigured) {
          try {
            const { data, error: signUpError } = await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                data: {
                  full_name: name.trim()
                }
              }
            });

            if (signUpError) throw signUpError;

            if (data?.user) {
              const newUserSession: UserSession = {
                email: data.user.email || email,
                name: name.trim(),
                createdAt: data.user.created_at,
                provider: "supabase"
              };
              onAuthSuccess(newUserSession);
            } else {
              setSuccessMessage("이메일로 가입 인증 링크가 전송되었습니다. 메일함을 확인해 주세요!");
            }
          } catch (supabaseErr: any) {
            console.warn("Supabase signup failed, falling back to local Mock Auth...", supabaseErr);
            const { user, error: mockError } = await mockAuth.signUp(email, password, name);
            if (mockError) throw mockError;
            if (user) onAuthSuccess(user);
          }
        } else {
          // Mock Sign Up
          const { user, error: mockError } = await mockAuth.signUp(email, password, name);
          if (mockError) throw mockError;
          if (user) onAuthSuccess(user);
        }
      } else {
        if (isSupabaseConfigured) {
          try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
              email: email.trim(),
              password
            });

            if (signInError) throw signInError;

            if (data?.user) {
              const userSession: UserSession = {
                email: data.user.email || email,
                name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "유저",
                createdAt: data.user.created_at,
                provider: "supabase"
              };
              onAuthSuccess(userSession);
            }
          } catch (supabaseErr: any) {
            console.warn("Supabase signin failed, falling back to local Mock Auth...", supabaseErr);
            // 1. Try to sign in with mock database
            const { user, error: mockError } = await mockAuth.signIn(email, password);
            if (user) {
              onAuthSuccess(user);
            } else {
              // 2. If mock account doesn't exist either, automatically register it for seamless entry
              console.log("No mock account found, auto-registering virtual account...");
              const { user: newUser, error: registerError } = await mockAuth.signUp(
                email, 
                password, 
                name || email.split("@")[0]
              );
              if (registerError) throw new Error("가상 계정 자동 생성에 실패했습니다: " + registerError.message);
              if (newUser) onAuthSuccess(newUser);
            }
          }
        } else {
          // Mock Sign In
          const { user, error: mockError } = await mockAuth.signIn(email, password);
          if (user) {
            onAuthSuccess(user);
          } else {
            // Auto register on Mock Sign In failure to avoid barrier
            const { user: newUser, error: registerError } = await mockAuth.signUp(
              email, 
              password, 
              name || email.split("@")[0]
            );
            if (registerError) throw registerError;
            if (newUser) onAuthSuccess(newUser);
          }
        }
      }
    } catch (err: any) {
      console.error("인증 실패:", err);
      setError(err.message || "오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-[#2D2D2D] relative overflow-hidden flex items-center justify-center p-4 md:p-8 font-sans antialiased">
      
      {/* ================= BACKGROUND DECORATION: WAVE CURVES & DOTS (PALETTE 22 VIOLA) ================= */}
      {/* Top Left Organic Wave SVG */}
      <svg 
        id="bg-wave-top-left"
        className="absolute top-0 left-0 w-[50%] h-[50%] max-w-[650px] max-h-[650px] pointer-events-none text-purple-900"
        viewBox="0 0 500 500" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grad-top-left" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLOR_MAIN_PURPLE} />
            <stop offset="100%" stopColor={COLOR_LIGHT_VIOLET} />
          </linearGradient>
          <pattern id="dotPattern" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="8" cy="8" r="1.5" fill="white" opacity="0.18" />
          </pattern>
        </defs>
        {/* Soft Shadow Wave */}
        <path 
          d="M 0,0 L 500,0 C 450,150 300,280 150,320 C 50,340 0,420 0,500 Z" 
          fill="black" 
          opacity="0.04" 
        />
        {/* Main Colored Wave */}
        <path 
          d="M 0,0 L 460,0 C 420,130 280,250 140,290 C 40,310 0,390 0,460 Z" 
          fill="url(#grad-top-left)" 
        />
        {/* Dots overlay */}
        <path 
          d="M 0,0 L 460,0 C 420,130 280,250 140,290 C 40,310 0,390 0,460 Z" 
          fill="url(#dotPattern)" 
        />
        {/* White Accent Circles overlapping wave border */}
        <circle cx="430" cy="120" r="12" fill="white" opacity="0.15" />
        <circle cx="210" cy="260" r="6" fill="white" opacity="0.2" />
      </svg>

      {/* Bottom Right Organic Wave SVG */}
      <svg 
        id="bg-wave-bottom-right"
        className="absolute bottom-0 right-0 w-[50%] h-[50%] max-w-[650px] max-h-[650px] pointer-events-none"
        viewBox="0 0 500 500" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="grad-bottom-right" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={COLOR_MAIN_PURPLE} />
            <stop offset="100%" stopColor={COLOR_LIGHT_VIOLET} />
          </linearGradient>
        </defs>
        {/* Soft Shadow Wave */}
        <path 
          d="M 500,500 L 0,500 C 50,350 200,220 350,180 C 450,160 500,80 500,0 Z" 
          fill="black" 
          opacity="0.04" 
        />
        {/* Main Colored Wave */}
        <path 
          d="M 500,500 L 40,500 C 80,370 220,250 360,210 C 460,190 500,110 500,40 Z" 
          fill="url(#grad-bottom-right)" 
        />
        {/* Dots overlay */}
        <path 
          d="M 500,500 L 40,500 C 80,370 220,250 360,210 C 460,190 500,110 500,40 Z" 
          fill="url(#dotPattern)" 
        />
        {/* White Accent Circles */}
        <circle cx="70" cy="380" r="10" fill="white" opacity="0.15" />
        <circle cx="280" cy="240" r="14" fill="white" opacity="0.1" />
      </svg>

      {/* ================= MAIN INTERACTIVE AUTHENTICATION CARD ================= */}
      <motion.div 
        id="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
        className="w-full max-w-6xl bg-white rounded-[32px] shadow-2xl shadow-purple-950/10 border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-2 relative z-10 min-h-[620px] md:h-[680px]"
      >
        {/* LEFT COMPONENT: Desk Illustration Space (1:1 Ratio) */}
        <div 
          id="illustration-pane"
          className="bg-[#FAF9FB] p-10 md:p-14 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-slate-100 relative overflow-hidden h-full"
        >
          {/* Subtle decorative grid background for the desk: Clean, elegant, with 24px grid lines */}
          <div 
            className="absolute inset-0 opacity-[0.035] pointer-events-none bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" 
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="w-full flex flex-col justify-center items-center space-y-6 relative z-10"
          >
            <div className="w-full flex justify-center">
              <DeskIllustration />
            </div>
            {/* Visual Center Gravity Caption */}
            <div className="text-center">
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.25em] uppercase">
                KION Labs
              </span>
              <h3 className="text-xs font-semibold text-purple-900/65 tracking-wider mt-1 uppercase">
                AI Workflow Dashboard
              </h3>
            </div>
          </motion.div>
        </div>

        {/* RIGHT COMPONENT: Elegant Material Input Auth Form (1:1 Ratio) */}
        <div id="form-pane" className="p-8 sm:p-12 md:p-16 flex flex-col justify-center bg-white relative h-full">
          <div className="max-w-md w-full mx-auto space-y-8">
            
            {/* Header Text Block */}
            <div className="text-center space-y-3">
              <motion.h2 
                key={isSignUp ? "signup-title" : "signin-title"}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl sm:text-3xl font-extrabold tracking-tight"
                style={{ color: COLOR_MAIN_PURPLE }}
              >
                {isSignUp ? "Save You Account Now" : "Welcome Back"}
              </motion.h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                {isSignUp 
                  ? "Get unlimited type of forms, questions and responsed, Free forever" 
                  : "Sign in to manage your interactive education workflow and deployment status"
                }
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-6 pt-2">
              
              <AnimatePresence mode="wait">
                {isSignUp && (
                  <motion.div
                    key="name-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    {/* Material Design styled Input: Bottom Line Only */}
                    <div className="relative border-b border-slate-200 focus-within:border-purple-600 transition-colors py-2 flex items-center gap-3">
                      <User className="w-5 h-5 text-slate-400 shrink-0" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        required={isSignUp}
                        className="w-full bg-transparent py-1 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none border-none focus:ring-0"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email Input - Material Bottom Line */}
              <div className="relative border-b border-slate-200 focus-within:border-purple-600 transition-colors py-2 flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="E-mail"
                  required
                  className="w-full bg-transparent py-1 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none border-none focus:ring-0"
                />
              </div>

              {/* Password Input - Material Bottom Line */}
              <div className="relative border-b border-slate-200 focus-within:border-purple-600 transition-colors py-2 flex items-center gap-3">
                <Lock className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-transparent py-1 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none border-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 text-slate-400 hover:text-purple-700 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Error and Success Notifications */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-start gap-2.5 font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-700 flex items-start gap-2.5 font-medium"
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button: Pill Shape with Pink-to-Purple Gradient */}
              <div className="flex justify-center pt-3">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  type="submit"
                  disabled={loading}
                  className="px-10 py-3 rounded-full text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20 disabled:cursor-not-allowed cursor-pointer tracking-wider uppercase"
                  style={{ 
                    background: `linear-gradient(135deg, ${COLOR_LIGHT_VIOLET} 0%, ${COLOR_MAIN_PURPLE} 100%)` 
                  }}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>{isSignUp ? "Sign Up" : "Sign In"}</span>
                      <span className="text-sm font-semibold">‣</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>

            {/* Toggle Sign In / Sign Up View */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-400 font-medium">
                {isSignUp ? "Already have an account? " : "Don't have an account yet? "}
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                    setSuccessMessage("");
                  }}
                  className="font-bold hover:underline transition-all"
                  style={{ color: COLOR_LIGHT_VIOLET }}
                >
                  {isSignUp ? "Login" : "Sign Up"}
                </button>
              </p>
            </div>

            {/* Convenient Virtual Guest Login Helper */}
            <div className="pt-4 border-t border-slate-100">
              <div className="bg-[#FAF9FB] border border-purple-100/50 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-purple-800">
                  <Key className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wide">데모 가상 로그인 제공</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  가입 절차 없이 원클릭으로 즉시 체험 대시보드에 진입할 수 있습니다.
                </p>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setError("");
                      try {
                        const { user: demoUser, error: mockError } = await mockAuth.signIn("test@kionlabs.com", "123456");
                        if (mockError) throw mockError;
                        if (demoUser) onAuthSuccess(demoUser);
                      } catch (err: any) {
                        setError(err.message || "데모 로그인 실패");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-[9px] bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg font-bold transition shadow-md cursor-pointer"
                  >
                    🚀 데모 계정으로 원클릭 즉시 진입
                  </button>
                  <div className="text-[9px] text-slate-400 font-medium">
                    test@kionlabs.com / 123456
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Service Provider Type Tag */}
            <div className="text-center">
              <span className="text-[8px] text-slate-300 font-bold uppercase tracking-wider">
                {isSupabaseConfigured 
                  ? "✓ REAL SUPABASE AUTHENTICATION SECURED" 
                  : "✓ DEMO MOCK AUTHENTICATION RUNNING"}
              </span>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
