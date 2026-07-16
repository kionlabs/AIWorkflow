import { createClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "";

// 실제 Supabase 설정 여부
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance: any = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Supabase initialization failed:", error);
  }
}

export const supabase = supabaseInstance;

// 로컬 가상 인증 백업 시스템 (localStorage 기반)
const MOCK_USERS_KEY = "kionlabs_mock_users";
const SESSION_USER_KEY = "kionlabs_session_user";

export interface UserSession {
  email: string;
  name?: string;
  createdAt: string;
  provider?: string;
}

export const mockAuth = {
  signUp: async (email: string, password: string, name?: string): Promise<{ user: UserSession | null; error: Error | null }> => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    if (!email || !email.includes("@")) {
      return { user: null, error: new Error("올바른 이메일 형식이 아닙니다.") };
    }
    if (!password || password.length < 6) {
      return { user: null, error: new Error("비밀번호는 최소 6자리 이상이어야 합니다.") };
    }

    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || "[]");
    if (users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return { user: null, error: new Error("이미 존재하는 이메일 주소입니다.") };
    }

    const newUser = { 
      email: email.toLowerCase(), 
      password, 
      name: name || email.split("@")[0], 
      createdAt: new Date().toISOString() 
    };
    
    users.push(newUser);
    localStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));

    const sessionUser: UserSession = { 
      email: newUser.email, 
      name: newUser.name, 
      createdAt: newUser.createdAt,
      provider: "local_mock"
    };
    
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
    return { user: sessionUser, error: null };
  },

  signIn: async (email: string, password: string): Promise<{ user: UserSession | null; error: Error | null }> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (!email || !email.includes("@")) {
      return { user: null, error: new Error("올바른 이메일 형식이 아닙니다.") };
    }

    const users = JSON.parse(localStorage.getItem(MOCK_USERS_KEY) || "[]");
    const user = users.find(
      (u: any) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      // 데모를 위한 기본 어드민 계정 제공
      if (email.toLowerCase() === "test@kionlabs.com" && password === "123456") {
        const demoUser: UserSession = { 
          email: "test@kionlabs.com", 
          name: "KION 데모 유저", 
          createdAt: new Date().toISOString(),
          provider: "demo"
        };
        localStorage.setItem(SESSION_USER_KEY, JSON.stringify(demoUser));
        return { user: demoUser, error: null };
      }
      return { user: null, error: new Error("이메일 또는 비밀번호가 일치하지 않습니다.") };
    }

    const sessionUser: UserSession = { 
      email: user.email, 
      name: user.name, 
      createdAt: user.createdAt,
      provider: "local_mock"
    };
    
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(sessionUser));
    return { user: sessionUser, error: null };
  },

  signOut: async (): Promise<{ error: Error | null }> => {
    localStorage.removeItem(SESSION_USER_KEY);
    return { error: null };
  },

  getSessionUser: (): UserSession | null => {
    const session = localStorage.getItem(SESSION_USER_KEY);
    return session ? JSON.parse(session) : null;
  }
};
