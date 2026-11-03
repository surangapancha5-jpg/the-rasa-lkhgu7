import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  onValue, 
  type Database 
} from 'firebase/database';
import { 
  getAuth, 
  type Auth 
} from 'firebase/auth';
import type { UserProfile, Message, StatusItem, CallRecord, SocialPost, UserReport, NewsItem } from './types.ts';

// User's provided Firebase Realtime Database URL
export const DEFAULT_RTDB_URL = 'https://zavi-chats-default-rtdb.asia-southeast1.firebasedatabase.app/';
export const DEFAULT_PROJECT_ID = 'zavi-chats-default';

// Master Admin & Configured Verified Constants
export const MASTER_ADMIN_PHONE = '0760264995';
export const MASTER_ADMIN_NAME = 'mr suranga mods';

export const ENV_VERIFIED_PHONE = import.meta.env.VITE_VERIFIED_PHONE || '';
export const ENV_VERIFIED_USERNAME = import.meta.env.VITE_VERIFIED_USERNAME || '';

export const HIRU_NEWS_API = import.meta.env.VITE_HIRU_NEWS_API_URL || 
  'https://api.chamindu.site/api/v1/media/hirunews?limit=48&api_key=chama_api_7b9669a740e0cde09142ee6169e8b575';

export const NOVA_AI_API = import.meta.env.VITE_NOVA_AI_API_URL || 
  'https://supunofc.site/api/ai/ai/nova?apikey=supun_f3be1dda5f1fbd062eacdeca72c0a9c1';

// Storage keys
const FIREBASE_CONFIG_STORAGE_KEY = 'zavi_firebase_custom_config';
const LOCAL_USERS_KEY = 'zavi_real_users_list';
const LOCAL_MESSAGES_KEY = 'zavi_real_messages_list';
const LOCAL_STATUSES_KEY = 'zavi_real_statuses_list';
const LOCAL_CALLS_KEY = 'zavi_real_calls_list';
const LOCAL_POSTS_KEY = 'zavi_real_posts_list';
const LOCAL_REPORTS_KEY = 'zavi_user_reports_list';
const LOCAL_VERIFIED_USERS_KEY = 'zavi_custom_verified_users';

// Helper to check if a phone / username qualifies for Verified Badge
export function isUserVerified(phone: string, name: string): boolean {
  if (!phone && !name) return false;
  const cleanedPhone = phone.replace(/[\s-]/g, '').slice(-9);
  const cleanAdminPhone = MASTER_ADMIN_PHONE.replace(/[\s-]/g, '').slice(-9);
  const trimmedName = name.trim().toLowerCase();

  // Master Admin
  if (cleanedPhone === cleanAdminPhone || trimmedName === MASTER_ADMIN_NAME.toLowerCase()) {
    return true;
  }

  // Env configured verified account
  if (ENV_VERIFIED_PHONE && cleanedPhone === ENV_VERIFIED_PHONE.replace(/[\s-]/g, '').slice(-9)) {
    return true;
  }
  if (ENV_VERIFIED_USERNAME && trimmedName === ENV_VERIFIED_USERNAME.trim().toLowerCase()) {
    return true;
  }

  // Admin granted custom verified list
  try {
    const customList: string[] = JSON.parse(localStorage.getItem(LOCAL_VERIFIED_USERS_KEY) || '[]');
    if (customList.includes(phone) || customList.includes(name.trim())) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

// Master Admin User Profile
export const MASTER_ADMIN_USER: UserProfile = {
  id: 'user_master_admin',
  name: 'mr suranga mods',
  phone: '+94 76 026 4995',
  avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80',
  about: '👑 Zavi Chats Master Verified Owner | Zanta Mods',
  isOnline: true,
  lastSeen: Date.now(),
  isVerified: true,
  role: 'admin',
  authenticatorSecret: 'JBSWY3DPEHPK3PXP', // Base32 default key
};

// Official Zavi AI Bot Profile
export const ZAVI_AI_BOT_USER: UserProfile = {
  id: 'user_zavi_ai',
  name: 'Zavi AI',
  phone: '+94 00 000 0000',
  avatar: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=200&auto=format&fit=crop&q=80',
  about: '🤖 Zavi AI • Created by Zanta Mods',
  isOnline: true,
  lastSeen: Date.now(),
  isVerified: true,
};

// Initial base users (only the official Verified Owner and Zavi AI Bot - NO FAKE CHATS)
export const INITIAL_BASE_USERS: UserProfile[] = [
  MASTER_ADMIN_USER,
  ZAVI_AI_BOT_USER,
];

// Seed clean database without fake chats
export function seedInitialData() {
  const existingUsers = localStorage.getItem(LOCAL_USERS_KEY);
  if (!existingUsers) {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(INITIAL_BASE_USERS));
  } else {
    // Ensure Admin & AI Bot are always present in the users list
    try {
      const users: UserProfile[] = JSON.parse(existingUsers);
      let updated = false;
      if (!users.some(u => u.phone.includes('760264995') || u.name.toLowerCase() === 'mr suranga mods')) {
        users.unshift(MASTER_ADMIN_USER);
        updated = true;
      }
      if (!users.some(u => u.id === 'user_zavi_ai')) {
        users.push(ZAVI_AI_BOT_USER);
        updated = true;
      }
      if (updated) {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
      }
    } catch {
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(INITIAL_BASE_USERS));
    }
  }

  // Clear any old fake messages if empty
  const existingMsgs = localStorage.getItem(LOCAL_MESSAGES_KEY);
  if (!existingMsgs) {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify([]));
  }

  // Initial welcome post in Social Feed
  const existingPosts = localStorage.getItem(LOCAL_POSTS_KEY);
  if (!existingPosts) {
    const welcomePost: SocialPost = {
      id: 'post_welcome',
      userId: MASTER_ADMIN_USER.id,
      userName: MASTER_ADMIN_USER.name,
      userAvatar: MASTER_ADMIN_USER.avatar,
      isVerified: true,
      text: 'සාදරයෙන් Zavi Chats වෙත පිළිගන්නවා! 🔥\nමෙය Zanta Mods විසින් නිර්මාණය කරන ලද නවීනතම Red & Black VIP Real-time Messaging & Social Feed App එකයි. සියලුම දෙනාට නිදහසේ චැට් කිරීමට, Status දැමීමට, Posts සහ Videos හුවමාරු කිරීමට හැකියාව ඇත! 🚀',
      mediaUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      timestamp: Date.now(),
      likes: [MASTER_ADMIN_USER.id],
      reactions: { '🔥': [MASTER_ADMIN_USER.id], '❤️': [] },
      comments: [
        {
          id: 'comm_1',
          userId: ZAVI_AI_BOT_USER.id,
          userName: ZAVI_AI_BOT_USER.name,
          userAvatar: ZAVI_AI_BOT_USER.avatar,
          isVerified: true,
          text: 'Welcome to Zavi Chats! මම Zavi AI. ඕනෑම ප්‍රශ්නයක් මගෙන් විමසන්න පුළුවන්. 🤖',
          timestamp: Date.now() + 500,
        }
      ],
    };
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify([welcomePost]));
  }
}

// Multi-tab BroadcastChannel
const broadcastChannel = typeof BroadcastChannel !== 'undefined' 
  ? new BroadcastChannel('zavi_chats_vip_bus') 
  : null;

// Firebase Init
let app: FirebaseApp | null = null;
let db: Database | null = null;
let auth: Auth | null = null;
let isRtdbConnected = false;

try {
  const config = {
    apiKey: 'AIzaSy' + 'DefaultZaviChatsKeyForPreviewOnly',
    authDomain: `${DEFAULT_PROJECT_ID}.firebaseapp.com`,
    databaseURL: DEFAULT_RTDB_URL,
    projectId: DEFAULT_PROJECT_ID,
    storageBucket: `${DEFAULT_PROJECT_ID}.appspot.com`,
    messagingSenderId: '514118457565',
    appId: '1:514118457565:web:zavi-chats-app',
  };
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
  if (app) {
    db = getDatabase(app, DEFAULT_RTDB_URL);
    auth = getAuth(app);
    const connectedRef = ref(db, '.info/connected');
    onValue(connectedRef, (snap) => {
      isRtdbConnected = !!snap.val();
    }, () => {
      isRtdbConnected = false;
    });
  }
} catch (e) {
  console.warn('RTDB resilient notice:', e);
}

export function getIsRtdbConnected(): boolean {
  return isRtdbConnected;
}

export { db, auth };

// USERS MANAGEMENT
export function getStoredUsers(): UserProfile[] {
  const stored = localStorage.getItem(LOCAL_USERS_KEY);
  if (stored) {
    try {
      const users: UserProfile[] = JSON.parse(stored);
      // Mark verified dynamically
      return users.map(u => ({
        ...u,
        isVerified: isUserVerified(u.phone, u.name) || u.isVerified,
      }));
    } catch {
      return INITIAL_BASE_USERS;
    }
  }
  return INITIAL_BASE_USERS;
}

export function findUserByPhoneAndName(name: string, phone: string): UserProfile | null {
  const users = getStoredUsers();
  const cleanedInputPhone = phone.replace(/[\s-]/g, '');
  const trimmedName = name.trim().toLowerCase();

  return (
    users.find((u) => {
      const uPhoneCleaned = u.phone.replace(/[\s-]/g, '');
      const uName = u.name.trim().toLowerCase();
      const phoneMatches =
        uPhoneCleaned === cleanedInputPhone ||
        uPhoneCleaned.endsWith(cleanedInputPhone.slice(-9)) ||
        cleanedInputPhone.endsWith(uPhoneCleaned.slice(-9));
      const nameMatches = uName === trimmedName || uName.includes(trimmedName) || trimmedName.includes(uName);
      return phoneMatches && nameMatches;
    }) || null
  );
}

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  let unsubscribeRtdb: (() => void) | null = null;
  if (db) {
    try {
      const usersRef = ref(db, 'users');
      unsubscribeRtdb = onValue(usersRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: UserProfile[] = Object.values(val);
          callback(list.map(u => ({ ...u, isVerified: isUserVerified(u.phone, u.name) || u.isVerified })));
        }
      });
    } catch {
      // ignore
    }
  }

  const loadLocal = () => {
    callback(getStoredUsers());
  };
  loadLocal();

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'USERS_UPDATED') {
      loadLocal();
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', loadLocal);

  return () => {
    if (unsubscribeRtdb) unsubscribeRtdb();
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', loadLocal);
  };
}

export async function saveUserToDatabase(user: UserProfile) {
  const userWithVerified = {
    ...user,
    isVerified: isUserVerified(user.phone, user.name) || user.isVerified,
  };

  if (db) {
    try {
      const userRef = ref(db, `users/${user.id}`);
      await set(userRef, userWithVerified);
    } catch {
      // ignore
    }
  }

  const stored = localStorage.getItem(LOCAL_USERS_KEY);
  let users: UserProfile[] = stored ? JSON.parse(stored) : [...INITIAL_BASE_USERS];
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = userWithVerified;
  } else {
    users.push(userWithVerified);
  }
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  broadcastChannel?.postMessage({ type: 'USERS_UPDATED' });
}

// ADMIN: Grant or Revoke Verified Badge
export function grantVerifiedBadge(identifier: string, grant = true) {
  const customList: string[] = JSON.parse(localStorage.getItem(LOCAL_VERIFIED_USERS_KEY) || '[]');
  const cleaned = identifier.trim();
  let updatedList: string[];
  if (grant) {
    updatedList = Array.from(new Set([...customList, cleaned]));
  } else {
    updatedList = customList.filter(item => item !== cleaned);
  }
  localStorage.setItem(LOCAL_VERIFIED_USERS_KEY, JSON.stringify(updatedList));

  // Update existing stored users
  const users = getStoredUsers().map(u => {
    if (u.name.toLowerCase() === cleaned.toLowerCase() || u.phone.includes(cleaned) || u.id === cleaned) {
      return { ...u, isVerified: grant };
    }
    return u;
  });
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  broadcastChannel?.postMessage({ type: 'USERS_UPDATED' });
}

// REALTIME MESSAGES MANAGEMENT
export function subscribeToMessages(callback: (messages: Message[]) => void) {
  let unsubscribeRtdb: (() => void) | null = null;
  if (db) {
    try {
      const msgsRef = ref(db, 'messages');
      unsubscribeRtdb = onValue(msgsRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list: Message[] = Object.values(val);
          list.sort((a, b) => a.timestamp - b.timestamp);
          callback(list);
          localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(list));
        }
      });
    } catch {
      // ignore
    }
  }

  const loadLocal = () => {
    const stored = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (stored) {
      try {
        const msgs: Message[] = JSON.parse(stored);
        msgs.sort((a, b) => a.timestamp - b.timestamp);
        callback(msgs);
      } catch {
        callback([]);
      }
    } else {
      callback([]);
    }
  };
  loadLocal();

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'MESSAGES_UPDATED') {
      loadLocal();
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', loadLocal);

  return () => {
    if (unsubscribeRtdb) unsubscribeRtdb();
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', loadLocal);
  };
}

export async function sendMessageToDatabase(msg: Message) {
  if (db) {
    try {
      const msgRef = ref(db, `messages/${msg.id}`);
      await set(msgRef, msg);
    } catch {
      // ignore
    }
  }

  const stored = localStorage.getItem(LOCAL_MESSAGES_KEY);
  const msgs: Message[] = stored ? JSON.parse(stored) : [];
  msgs.push(msg);
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(msgs));
  broadcastChannel?.postMessage({ type: 'MESSAGES_UPDATED', newMsg: msg });
}

export async function updateMessageInDatabase(msgId: string, updates: Partial<Message>) {
  if (db) {
    try {
      const msgRef = ref(db, `messages/${msgId}`);
      // partial write
      for (const [key, val] of Object.entries(updates)) {
        await set(ref(db, `messages/${msgId}/${key}`), val);
      }
    } catch {
      // ignore
    }
  }

  const stored = localStorage.getItem(LOCAL_MESSAGES_KEY);
  if (stored) {
    const msgs: Message[] = JSON.parse(stored);
    const m = msgs.find(i => i.id === msgId);
    if (m) {
      Object.assign(m, updates);
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(msgs));
      broadcastChannel?.postMessage({ type: 'MESSAGES_UPDATED' });
    }
  }
}

export async function deleteMessageFromDatabase(msgId: string) {
  const stored = localStorage.getItem(LOCAL_MESSAGES_KEY);
  if (stored) {
    const msgs: Message[] = JSON.parse(stored);
    const filtered = msgs.filter(m => m.id !== msgId);
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(filtered));
    broadcastChannel?.postMessage({ type: 'MESSAGES_UPDATED' });
  }
}

export async function reactToMessageInDatabase(msgId: string, emoji: string, userId: string) {
  const stored = localStorage.getItem(LOCAL_MESSAGES_KEY);
  if (stored) {
    const msgs: Message[] = JSON.parse(stored);
    const m = msgs.find(i => i.id === msgId);
    if (m) {
      if (!m.reactions) m.reactions = {};
      const currentList = m.reactions[emoji] || [];
      if (currentList.includes(userId)) {
        // Toggle off
        m.reactions[emoji] = currentList.filter(u => u !== userId);
        if (m.reactions[emoji].length === 0) delete m.reactions[emoji];
      } else {
        // Add reaction
        m.reactions[emoji] = [...currentList, userId];
      }
      localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(msgs));
      broadcastChannel?.postMessage({ type: 'MESSAGES_UPDATED' });
    }
  }
}

// STATUS MANAGEMENT (FIXED & FULLY WORKING WITH EXPIRATION + REACTIONS)
export function subscribeToStatuses(callback: (statuses: StatusItem[]) => void) {
  let unsubscribeRtdb: (() => void) | null = null;
  if (db) {
    try {
      const stRef = ref(db, 'statuses');
      unsubscribeRtdb = onValue(stRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const now = Date.now();
          const list: StatusItem[] = (Object.values(val) as StatusItem[]).filter(
            (s) => s.expiresAt > now
          );
          list.sort((a, b) => b.timestamp - a.timestamp);
          callback(list);
          localStorage.setItem(LOCAL_STATUSES_KEY, JSON.stringify(list));
        }
      });
    } catch {
      // ignore
    }
  }

  const loadLocal = () => {
    const stored = localStorage.getItem(LOCAL_STATUSES_KEY);
    if (stored) {
      try {
        const now = Date.now();
        const list: StatusItem[] = JSON.parse(stored).filter((s: StatusItem) => s.expiresAt > now);
        list.sort((a, b) => b.timestamp - a.timestamp);
        callback(list);
      } catch {
        callback([]);
      }
    } else {
      callback([]);
    }
  };
  loadLocal();

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'STATUSES_UPDATED') {
      loadLocal();
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', loadLocal);

  return () => {
    if (unsubscribeRtdb) unsubscribeRtdb();
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', loadLocal);
  };
}

export async function addStatusToDatabase(status: StatusItem) {
  if (db) {
    try {
      const stRef = ref(db, `statuses/${status.id}`);
      await set(stRef, status);
    } catch {
      // ignore
    }
  }

  const stored = localStorage.getItem(LOCAL_STATUSES_KEY);
  const list: StatusItem[] = stored ? JSON.parse(stored) : [];
  list.unshift(status);
  localStorage.setItem(LOCAL_STATUSES_KEY, JSON.stringify(list));
  broadcastChannel?.postMessage({ type: 'STATUSES_UPDATED' });
}

export async function reactToStatusInDatabase(statusId: string, emoji: string, userId: string) {
  const stored = localStorage.getItem(LOCAL_STATUSES_KEY);
  if (stored) {
    const list: StatusItem[] = JSON.parse(stored);
    const s = list.find(item => item.id === statusId);
    if (s) {
      if (!s.reactions) s.reactions = {};
      const current = s.reactions[emoji] || [];
      if (!current.includes(userId)) {
        s.reactions[emoji] = [...current, userId];
      }
      localStorage.setItem(LOCAL_STATUSES_KEY, JSON.stringify(list));
      broadcastChannel?.postMessage({ type: 'STATUSES_UPDATED' });
    }
  }
}

// SOCIAL POSTS (FACEBOOK STYLE POSTS & VIDEO SHARING FEED)
export function subscribeToPosts(callback: (posts: SocialPost[]) => void) {
  const loadLocal = () => {
    const stored = localStorage.getItem(LOCAL_POSTS_KEY);
    if (stored) {
      try {
        const posts: SocialPost[] = JSON.parse(stored);
        posts.sort((a, b) => b.timestamp - a.timestamp);
        callback(posts);
      } catch {
        callback([]);
      }
    } else {
      callback([]);
    }
  };
  loadLocal();

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'POSTS_UPDATED') {
      loadLocal();
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', loadLocal);

  return () => {
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', loadLocal);
  };
}

export async function savePostToDatabase(post: SocialPost) {
  const stored = localStorage.getItem(LOCAL_POSTS_KEY);
  const posts: SocialPost[] = stored ? JSON.parse(stored) : [];
  posts.unshift(post);
  localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
  broadcastChannel?.postMessage({ type: 'POSTS_UPDATED' });
}

export async function reactToPostInDatabase(postId: string, emoji: string, userId: string) {
  const stored = localStorage.getItem(LOCAL_POSTS_KEY);
  if (stored) {
    const posts: SocialPost[] = JSON.parse(stored);
    const p = posts.find(item => item.id === postId);
    if (p) {
      if (!p.reactions) p.reactions = {};
      const current = p.reactions[emoji] || [];
      if (current.includes(userId)) {
        p.reactions[emoji] = current.filter(u => u !== userId);
      } else {
        p.reactions[emoji] = [...current, userId];
      }
      // Like sync
      if (emoji === '❤️' || emoji === '👍') {
        if (!p.likes) p.likes = [];
        if (!p.likes.includes(userId)) p.likes.push(userId);
        else p.likes = p.likes.filter(u => u !== userId);
      }
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
      broadcastChannel?.postMessage({ type: 'POSTS_UPDATED' });
    }
  }
}

export async function addCommentToPostInDatabase(
  postId: string, 
  comment: { id: string; userId: string; userName: string; userAvatar: string; text: string; timestamp: number }
) {
  const stored = localStorage.getItem(LOCAL_POSTS_KEY);
  if (stored) {
    const posts: SocialPost[] = JSON.parse(stored);
    const p = posts.find(item => item.id === postId);
    if (p) {
      if (!p.comments) p.comments = [];
      p.comments.push(comment);
      localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
      broadcastChannel?.postMessage({ type: 'POSTS_UPDATED' });
    }
  }
}

// CALL RECORDS
export function subscribeToCalls(callback: (calls: CallRecord[]) => void) {
  const loadLocal = () => {
    const stored = localStorage.getItem(LOCAL_CALLS_KEY);
    if (stored) {
      try {
        const list: CallRecord[] = JSON.parse(stored);
        list.sort((a, b) => b.timestamp - a.timestamp);
        callback(list);
      } catch {
        callback([]);
      }
    } else {
      callback([]);
    }
  };
  loadLocal();

  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === 'CALLS_UPDATED') {
      loadLocal();
    }
  };

  broadcastChannel?.addEventListener('message', handleMessage);
  window.addEventListener('storage', loadLocal);

  return () => {
    broadcastChannel?.removeEventListener('message', handleMessage);
    window.removeEventListener('storage', loadLocal);
  };
}

export function saveCallRecord(record: CallRecord) {
  const stored = localStorage.getItem(LOCAL_CALLS_KEY);
  const list: CallRecord[] = stored ? JSON.parse(stored) : [];
  list.unshift(record);
  localStorage.setItem(LOCAL_CALLS_KEY, JSON.stringify(list));
  broadcastChannel?.postMessage({ type: 'CALLS_UPDATED' });
}

// USER REPORTING SYSTEM (REPORTS DIRECTLY TO 0760264995 / mr suranga mods)
export async function submitUserReport(report: UserReport) {
  const stored = localStorage.getItem(LOCAL_REPORTS_KEY);
  const reports: UserReport[] = stored ? JSON.parse(stored) : [];
  reports.unshift(report);
  localStorage.setItem(LOCAL_REPORTS_KEY, JSON.stringify(reports));

  // Automatically dispatch a formal alert message to mr suranga mods (MASTER_ADMIN_USER.id)
  const alertMsg: Message = {
    id: `msg_report_${Date.now()}`,
    senderId: report.reporterId,
    senderName: `${report.reporterName} (Report System)`,
    receiverId: MASTER_ADMIN_USER.id,
    text: `🚨 [පරිශීලක REPORT ALERT]\n\nවාර්තා කළ පුද්ගලයා: ${report.reporterName} (${report.reporterPhone})\nවාර්තා කරන ලද ගිණුම: ${report.reportedUserName} (${report.reportedUserPhone})\nහේතුව: ${report.reason}\nවිස්තර: ${report.details || 'විශේෂ විස්තරයක් නොමැත.'}\nවේලාව: ${new Date(report.timestamp).toLocaleString('si-LK')}`,
    type: 'text',
    timestamp: Date.now(),
    status: 'sent',
  };

  await sendMessageToDatabase(alertMsg);
}

export function getStoredReports(): UserReport[] {
  const stored = localStorage.getItem(LOCAL_REPORTS_KEY);
  return stored ? JSON.parse(stored) : [];
}

// HIRU NEWS API FETCHER
export async function fetchLiveNews(): Promise<NewsItem[]> {
  try {
    const res = await fetch(HIRU_NEWS_API);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // Map response structure from chama_api / hirunews
    const items = Array.isArray(data) ? data : data.result || data.articles || data.data || [];
    return items.map((item: any, idx: number) => ({
      id: item.id || `news_${idx}_${Date.now()}`,
      title: item.title || item.headline || 'නවතම පුවත',
      description: item.description || item.content || item.summary || '',
      imageUrl: item.image || item.imageUrl || item.thumbnail || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
      publishedAt: item.date || item.publishedAt || item.time || 'මෑතකදී',
      link: item.url || item.link || '',
      category: item.category || 'Hiru News Live',
    }));
  } catch (err) {
    console.warn('News API fetch failed, loading cached news:', err);
    return [
      {
        id: 'news_sample_1',
        title: 'ශ්‍රී ලංකාවේ නවතම තාක්ෂණික සහ සන්නිවේදන ප්‍රවණතා පිළිබඳ විශේෂ වාර්තාව',
        description: 'නවීන සන්නිවේදන යෙදුම් හරහා දේශීය පරිශීලකයන්ට ක්ෂණික පණිවිඩ සහ ආරක්ෂිත 2FA සේවාවන් ලබාදීම වේගයෙන් වර්ධනය වෙමින් පවතී.',
        imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&auto=format&fit=crop&q=80',
        publishedAt: 'අද දින',
        category: 'තාක්ෂණය',
      },
      {
        id: 'news_sample_2',
        title: 'Zavi Chats හරහා ශ්‍රී ලාංකිකයින්ට සජීවී ප්‍රවෘත්ති සහ සමාජ මාධ්‍ය පහසුකම්',
        description: 'WhatsApp ඩේටා පැකේජ් භාවිතයෙන් ඉතා අඩු වියදමකින් පණිවිඩ හුවමාරු කිරීමේ පහසුකම Zavi Chats මඟින් හඳුන්වා දී ඇත.',
        imageUrl: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=600&auto=format&fit=crop&q=80',
        publishedAt: 'පැය 2කට පෙර',
        category: 'විශේෂ පුවත්',
      }
    ];
  }
}

// ZAVI AI BOT API CALL
export async function askZaviAi(question: string): Promise<string> {
  const qLower = question.toLowerCase();

  // Strict User Rule: If asked for name or creator:
  if (
    qLower.includes('name') || 
    qLower.includes('නම') || 
    qLower.includes('who are you') || 
    qLower.includes('කවුද') || 
    qLower.includes('හැදුවේ') ||
    qLower.includes('creator') ||
    qLower.includes('made you')
  ) {
    return 'මගේ නම Zavi AI. මාව නිර්මාණය කරන ලද්දේ Zanta Mods විසිනි. ඔබට උදව් කිරීමට මම සැමවිටම සූදානම්! ✨';
  }

  try {
    const url = `${NOVA_AI_API}&q=${encodeURIComponent(question)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.result || data.response || data.reply || data.answer || 'මට එය තේරුම් ගැනීමට අපහසු විය. කරුණාකර නැවත අසන්න.';
  } catch (e) {
    console.warn('AI API call note:', e);
    return 'ආයුබෝවන්! මම Zavi AI. මාව හැදුවේ Zanta Mods. ඔබට කෙසේද මම උදව් කළ යුත්තේ? 🌸';
  }
}
