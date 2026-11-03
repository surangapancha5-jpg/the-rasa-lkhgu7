import React, { useState, useRef, useEffect } from 'react';
import { 
  Phone, 
  MessageSquare, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Camera, 
  AlertCircle,
  Sparkles,
  Lock,
  Search, 
  MoreVertical, 
  Users, 
  Settings, 
  LogOut, 
  CircleDashed, 
  PhoneCall, 
  Check, 
  CheckCheck, 
  Image as ImageIcon, 
  Mic, 
  MessageSquarePlus, 
  ArrowLeft, 
  Video, 
  Smile, 
  Paperclip, 
  Send, 
  Play, 
  Pause, 
  X, 
  Trash2, 
  ShieldAlert, 
  Plus, 
  Edit3, 
  Eye,
  Key,
  Copy,
  ExternalLink,
  LogIn,
  UserPlus,
  Pin,
  PinOff,
  Forward,
  Flag,
  Share2,
  ThumbsUp,
  Heart,
  MessageCircle,
  Newspaper,
  Compass,
  Crown,
  RefreshCw,
  Info,
  BadgeCheck,
  VideoOff,
  MicOff,
  PhoneOff
} from 'lucide-react';

import type { UserProfile, Chat, Message, StatusItem, SocialPost, NewsItem } from './types.ts';
import { useAuth, useChat } from './context.tsx';
import { MASTER_ADMIN_PHONE, MASTER_ADMIN_NAME, ZAVI_AI_BOT_USER } from './firebase.ts';
import { formatTime, formatDateOrTime, startAudioRecording, stopAudioRecording } from './audio.ts';
import { 
  generateAuthenticatorKey, 
  getAuthenticatorTotp, 
  generateQrCodeDataUrl, 
  verifyAuthenticatorOtp, 
  getCurrentOtp 
} from './totp.ts';
import { EmojiKeyboard } from './EmojiKeyboard.tsx';

export type MainTab = 'chats' | 'news' | 'feed' | 'status' | 'calls';

// ==========================================
// VERIFIED BADGE COMPONENT
// ==========================================
export const VerifiedBadge: React.FC<{ size?: number; className?: string }> = ({ size = 15, className = '' }) => {
  return (
    <span 
      title="Verified Account (තහවුරු කළ ගිණුම)" 
      className={`inline-flex items-center justify-center text-sky-400 align-middle shrink-0 ${className}`}
    >
      <BadgeCheck 
        style={{ width: size, height: size }} 
        className="fill-sky-500 text-[#09090b] drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]" 
      />
    </span>
  );
};

// ==========================================
// AUTH SCREEN (VIP RED & BLACK TOTP)
// ==========================================
const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
];

export const AuthScreen: React.FC = () => {
  const { loginUser } = useAuth();
  const { users } = useChat();
  const [authMode, setAuthMode] = useState<'register' | 'login'>('login');
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatar, setAvatar] = useState(SAMPLE_AVATARS[0]);
  const [about, setAbout] = useState('Zavi Chats භාවිත කරයි 🚀');

  // Register
  const [registerStep, setRegisterStep] = useState<'info' | 'authenticator'>('info');
  const [secretKey, setSecretKey] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [totpUri, setTotpUri] = useState<string>('');
  const [registerOtp, setRegisterOtp] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Login
  const [loginStep, setLoginStep] = useState<'credentials' | 'authenticator'>('credentials');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [loginOtp, setLoginOtp] = useState('');

  const [secondsRemaining, setSecondsRemaining] = useState(30);

  useEffect(() => {
    const updateCountdown = () => {
      const sec = 30 - (Math.floor(Date.now() / 1000) % 30);
      setSecondsRemaining(sec);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPhone = (input: string) => {
    const cleaned = input.replace(/[\s-]/g, '');
    if (cleaned.startsWith('+94')) return cleaned;
    if (cleaned.startsWith('0')) return `+94${cleaned.slice(1)}`;
    return `+94${cleaned}`;
  };

  const handleSwitchMode = (mode: 'register' | 'login') => {
    setAuthMode(mode);
    setError(null);
    setRegisterStep('info');
    setLoginStep('credentials');
    setRegisterOtp('');
    setLoginOtp('');
    setFoundUser(null);
  };

  const handleProceedToAuthenticatorSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('කරුණාකර ඔබගේ නම ඇතුළත් කරන්න.');
      return;
    }

    const cleanedPhone = phoneNumber.replace(/[\s-]/g, '');
    if (!cleanedPhone || cleanedPhone.length < 9) {
      setError('කරුණාකර නිවැරදි ශ්‍රී ලාංකික දුරකථන අංකයක් ඇතුළත් කරන්න (උදා: 077 123 4567).');
      return;
    }

    const formatted = formatPhone(phoneNumber);
    const newSecret = generateAuthenticatorKey();
    const totp = getAuthenticatorTotp(name.trim(), formatted, newSecret);
    const uri = totp.toString();
    const qrDataUrl = await generateQrCodeDataUrl(uri);

    setSecretKey(newSecret);
    setTotpUri(uri);
    setQrCodeUrl(qrDataUrl);
    setRegisterStep('authenticator');
  };

  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (registerOtp.length !== 6) {
      setError('කරුණාකර Authenticator App එකෙන් ලැබුණු ඉලක්කම් 6 OTP කේතය ඇතුළත් කරන්න.');
      return;
    }

    const formatted = formatPhone(phoneNumber);
    const isValid = verifyAuthenticatorOtp(secretKey, registerOtp, name.trim(), formatted);

    if (!isValid) {
      setError('Authenticator OTP අංකය වැරදියි හෝ කල් ඉකුත් වී ඇත! කරුණාකර ඔබගේ Authenticator App එකේ (Google Authenticator) පෙන්වන නවතම කේතය ඇතුළත් කරන්න.');
      return;
    }

    const newUser: UserProfile = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      phone: formatted,
      avatar,
      about: about.trim() || 'Zavi Chats VIP භාවිත කරයි 🚀',
      isOnline: true,
      lastSeen: Date.now(),
      blockedUsers: [],
      authenticatorSecret: secretKey,
    };

    await loginUser(newUser);
  };

  const handleProceedToLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phoneNumber.trim()) {
      setError('කරුණාකර ලියාපදිංචි වූ නම සහ දුරකථන අංකය ඇතුළත් කරන්න.');
      return;
    }

    const formatted = formatPhone(phoneNumber);
    const cleanedInput = formatted.replace(/[\s-]/g, '').slice(-9);
    const trimmedInputName = name.trim().toLowerCase();

    // Check in users
    const matched = users.find(u => {
      const uPhone = u.phone.replace(/[\s-]/g, '').slice(-9);
      const uName = u.name.trim().toLowerCase();
      return (uPhone === cleanedInput || cleanedInput === uPhone) && (uName === trimmedInputName || uName.includes(trimmedInputName) || trimmedInputName.includes(uName));
    });

    if (!matched) {
      setError('මෙම නම සහ දුරකථන අංකයෙන් ලියාපදිංචි වූ ගිණුමක් හමු නොවීය! කරුණාකර ලියාපදිංචි වූ තොරතුරු නිවැරදිව ලබාදෙන්න හෝ Register වන්න.');
      return;
    }

    setFoundUser(matched);
    setLoginStep('authenticator');
  };

  const handleVerifyLoginOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!foundUser) return;
    if (loginOtp.length !== 6) {
      setError('කරුණාකර Authenticator App එකෙන් ලැබෙන අංක 6 කේතය ඇතුළත් කරන්න.');
      return;
    }

    const userSecret = foundUser.authenticatorSecret || 'JBSWY3DPEHPK3PXP';
    const isValid = verifyAuthenticatorOtp(userSecret, loginOtp, foundUser.name, foundUser.phone);

    if (!isValid) {
      setError('ඇතුළත් කළ Authenticator OTP කේතය වැරදියි! කරුණාකර Authenticator App එකේ ඇති නවතම කේතය ඇතුළත් කරන්න.');
      return;
    }

    await loginUser(foundUser);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#09090b] via-[#121216] to-[#1c080e] flex flex-col justify-center items-center p-3 sm:p-4 select-none">
      <div className="w-full max-w-md bg-[#141418] rounded-3xl shadow-2xl border border-[#e11d48]/30 overflow-hidden transition-all shadow-red-glow">
        
        {/* VIP Red & Black Header */}
        <div className="bg-gradient-to-r from-[#991b1b] via-[#be123c] to-[#e11d48] p-5 text-center text-white relative">
          <div className="w-14 h-14 bg-black/30 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner border border-white/20">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-2xl font-black tracking-tight">ZAVI CHATS</h1>
            <Crown className="w-5 h-5 text-amber-300" />
          </div>
          <p className="text-red-100 text-xs mt-0.5 font-medium">
            VIP Red & Black Messaging Platform • By Zanta Mods
          </p>

          {/* Mode Switcher */}
          <div className="flex bg-black/40 p-1 rounded-xl mt-3.5 max-w-xs mx-auto border border-white/10">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMode === 'login' ? 'bg-[#e11d48] text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>ඇතුල් වීම (Login)</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMode === 'register' ? 'bg-[#e11d48] text-white shadow-md' : 'text-gray-300 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ලියාපදිංචිය (Register)</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FLOW */}
          {authMode === 'login' && loginStep === 'credentials' && (
            <div>
              <div className="text-center mb-4">
                <h2 className="text-base font-bold text-white">
                  Zavi Chats වෙත ඇතුල් වන්න
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  ලියාපදිංචි වූ නම සහ දුරකථන අංකය ඇතුළත් කරන්න.
                </p>
              </div>

              <form onSubmit={handleProceedToLoginOtp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ලියාපදිංචි වූ නම (User Name)
                  </label>
                  <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                    <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="උදා: mr suranga mods"
                      className="w-full text-sm text-white bg-transparent focus:outline-none placeholder-gray-500"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ලියාපදිංචි වූ දුරකථන අංකය
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                    <div className="bg-[#24242c] px-3 py-2.5 flex items-center gap-1.5 border-r border-[#27272e] text-gray-300 font-medium text-xs">
                      <span>🇱🇰</span>
                      <span>+94</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="76 026 4995"
                      className="w-full px-3 py-2.5 text-white bg-transparent focus:outline-none text-sm font-medium placeholder-gray-500"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] hover:to-[#f43f5e] active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  <span>ඉදිරියට (Next)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Master Owner / Admin quick login test card */}
              <div className="mt-5 pt-3.5 border-t border-[#27272e]">
                <p className="text-[11px] font-semibold text-gray-400 mb-2 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Master Verified Owner Account:</span>
                </p>
                <div 
                  onClick={() => {
                    setName('mr suranga mods');
                    setPhoneNumber('0760264995');
                    const adminUser = users.find(u => u.phone.includes('760264995') || u.name.toLowerCase() === 'mr suranga mods');
                    if (adminUser) {
                      setFoundUser(adminUser);
                      setLoginStep('authenticator');
                    }
                  }}
                  className="p-2.5 bg-[#1c1c23] hover:bg-[#252530] border border-[#e11d48]/40 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <img 
                      src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80" 
                      alt="Admin" 
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-[#e11d48]" 
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-white">mr suranga mods</span>
                        <VerifiedBadge size={14} />
                      </div>
                      <p className="text-[10px] text-gray-400 font-mono">0760264995</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-red-400 font-semibold bg-red-950/60 px-2 py-0.5 rounded-md border border-red-800">
                    Auto-Fill
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* LOGIN STEP 2: VERIFY REAL AUTHENTICATOR OTP */}
          {authMode === 'login' && loginStep === 'authenticator' && foundUser && (
            <div>
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-red-950/60 border border-red-700/50 text-[#e11d48] rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white">
                  Authenticator OTP අංකය
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Authenticator App එකේ Zavi Chats සඳහා ලැබෙන අංක 6 කේතය ඇතුළත් කරන්න.
                </p>
              </div>

              {/* Found user card */}
              <div className="bg-[#1c1c23] p-3 rounded-xl border border-[#27272e] flex items-center gap-3 mb-4">
                <img
                  src={foundUser.avatar}
                  alt={foundUser.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-[#e11d48]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-white truncate">{foundUser.name}</p>
                    {foundUser.isVerified && <VerifiedBadge size={13} />}
                  </div>
                  <p className="text-[11px] text-gray-400">{foundUser.phone}</p>
                </div>

                {foundUser.authenticatorSecret && (
                  <button
                    type="button"
                    onClick={() => {
                      const code = getCurrentOtp(foundUser.authenticatorSecret!, foundUser.name, foundUser.phone);
                      setLoginOtp(code);
                    }}
                    className="px-2.5 py-1 bg-[#e11d48]/20 hover:bg-[#e11d48]/30 border border-[#e11d48]/40 text-red-300 text-[10px] font-mono rounded-lg transition-colors cursor-pointer"
                  >
                    Auto-Fill OTP
                  </button>
                )}
              </div>

              <form onSubmit={handleVerifyLoginOtp} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-1 font-semibold">
                    <span>Authenticator OTP (අංක 6):</span>
                    <span className="text-[10px] text-red-400 font-mono">
                      කේතය: {secondsRemaining}s
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 bg-[#1a1a20] border border-[#27272e] rounded-xl text-white focus:outline-none focus:border-[#e11d48]"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>තහවුරු කර ඇතුල් වන්න</span>
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setLoginStep('credentials')}
                    className="text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    නම හෝ අංකය වෙනස් කිරීමට ආපසු යන්න
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* REGISTER FLOW (NO SMS OTP -> AUTHENTICATOR APP SECRET) */}
          {authMode === 'register' && registerStep === 'info' && (
            <div>
              <div className="text-center mb-4">
                <h2 className="text-base font-bold text-white">
                  නව VIP ගිණුමක් සාදන්න
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  SMS OTP අවශ්‍ය නොවේ. Authenticator App මඟින් සත්‍යාපනය කරයි.
                </p>
              </div>

              <form onSubmit={handleProceedToAuthenticatorSetup} className="space-y-3.5">
                <div className="flex flex-col items-center gap-1.5 mb-1">
                  <div className="relative group cursor-pointer">
                    <img
                      src={avatar}
                      alt="Avatar"
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-[#e11d48]"
                    />
                    <label className="absolute bottom-0 right-0 bg-[#e11d48] p-1 rounded-full text-white shadow-lg cursor-pointer hover:bg-[#be123c]">
                      <Camera className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setAvatar(reader.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ඔබගේ නම (User Name)
                  </label>
                  <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                    <User className="w-4 h-4 text-gray-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="උදා: දිලිප් රත්නායක"
                      className="w-full text-sm text-white bg-transparent focus:outline-none placeholder-gray-500"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    ශ්‍රී ලංකා ජංගම දුරකථන අංකය
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-[#27272e] bg-[#1a1a20] focus-within:border-[#e11d48]">
                    <div className="bg-[#24242c] px-3 py-2.5 flex items-center gap-1.5 border-r border-[#27272e] text-gray-300 font-medium text-xs">
                      <span>🇱🇰</span>
                      <span>+94</span>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="77 123 4567"
                      className="w-full px-3 py-2.5 text-white bg-transparent focus:outline-none text-sm font-medium placeholder-gray-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    About (තත්ත්වය)
                  </label>
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Zavi Chats භාවිත කරයි 🚀"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#27272e] bg-[#1a1a20] text-xs text-white focus:outline-none focus:border-[#e11d48]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer mt-2"
                >
                  <span>Authenticator Key එක සාදන්න</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* REGISTER STEP 2: SCAN QR / COPY KEY */}
          {authMode === 'register' && registerStep === 'authenticator' && (
            <div>
              <div className="text-center mb-3">
                <div className="w-10 h-10 bg-red-950/60 border border-red-700/50 text-[#e11d48] rounded-full flex items-center justify-center mx-auto mb-1.5">
                  <Key className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-white">
                  Authenticator Key එක සම්බන්ධ කරන්න
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Google Authenticator මඟින් පහත QR Code එක Scan කරන්න.
                </p>
              </div>

              <div className="bg-[#1c1c23] p-3 rounded-2xl border border-[#27272e] flex flex-col items-center mb-3">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="Authenticator QR"
                    className="w-36 h-36 rounded-xl shadow border border-white"
                  />
                )}

                <div className="w-full mt-2.5">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>Secret Key (Manual Entry):</span>
                    {copiedKey && <span className="text-red-400 font-semibold">Copied! ✔</span>}
                  </div>
                  <div className="flex items-center justify-between bg-[#121216] px-3 py-1.5 rounded-lg border border-[#27272e] font-mono text-xs text-red-400 font-bold select-all">
                    <span className="truncate mr-2">{secretKey}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(secretKey);
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="text-gray-400 hover:text-white cursor-pointer"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <a
                  href={totpUri}
                  className="mt-2 text-[11px] text-red-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Authenticator App එකෙන් කෙලින්ම විවෘත කරන්න</span>
                </a>
              </div>

              <form onSubmit={handleVerifyRegisterOtp} className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-1 font-semibold">
                    <span>Authenticator අංක 6 කේතය:</span>
                    <span className="text-[10px] text-red-400 font-mono">({secondsRemaining}s)</span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={registerOtp}
                    onChange={(e) => setRegisterOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[0.5em] text-2xl font-bold py-2 bg-[#1a1a20] border border-[#27272e] rounded-xl text-white focus:outline-none focus:border-[#e11d48]"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ගිණුම තහවුරු කර ලියාපදිංචි වන්න</span>
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="bg-[#0e0e12] px-6 py-2.5 border-t border-[#27272e] flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <Lock className="w-3.5 h-3.5 text-red-500" />
          <span>Zavi Chats • Designed & Developed by Zanta Mods</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// VIP HEADER COMPONENT
// ==========================================
interface HeaderProps {
  onOpenNewGroup: () => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
  onOpenAdminVerify: () => void;
  onSearchToggle: () => void;
  isSearching: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewGroup,
  onOpenProfile,
  onOpenAbout,
  onOpenAdminVerify,
  onSearchToggle,
  isSearching,
  searchQuery,
  onSearchChange,
}) => {
  const { currentUser, logout, isAdmin } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#121216] border-b border-[#27272e] text-white shadow-lg relative z-30 select-none">
      <div className="px-4 py-3 flex items-center justify-between">
        
        {/* Brand & User info */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#991b1b] to-[#e11d48] flex items-center justify-center shadow-red-glow">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1">
                ZAVI CHATS
              </h1>
              <span className="text-[10px] px-1.5 py-0.2 bg-[#e11d48]/20 text-[#e11d48] border border-[#e11d48]/40 rounded font-black tracking-widest">
                VIP
              </span>
            </div>

            {currentUser && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <span className="truncate max-w-[140px] font-medium text-gray-200">
                  {currentUser.name}
                </span>
                {currentUser.isVerified && <VerifiedBadge size={13} />}
                <span className="text-gray-500">•</span>
                <span className="text-emerald-400 text-[10px]">Live</span>
              </div>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onSearchToggle}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSearching ? 'bg-[#e11d48] text-white' : 'text-gray-300 hover:text-white hover:bg-white/5'
            }`}
            title="සොයන්න"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Three Dots Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(p => !p)}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="මෙනුව"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a21] border border-[#27272e] rounded-2xl shadow-2xl py-1.5 text-sm z-50 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenNewGroup();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 text-gray-200 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#e11d48]" />
                  <span>නව සමූහයක් (New Group)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 text-gray-200 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-[#e11d48]" />
                  <span>මගේ ගිණුම (Profile)</span>
                </button>

                {/* Master Admin Panel link */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onOpenAdminVerify();
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 bg-red-950/40 hover:bg-red-900/40 text-amber-300 font-semibold border-y border-red-900/40 transition-colors cursor-pointer"
                  >
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span>👑 Verified Badges Manager</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onOpenAbout();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-white/5 text-gray-200 transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-[#e11d48]" />
                  <span>Zavi Chats ගැන (About)</span>
                </button>

                <hr className="my-1 border-[#27272e]" />

                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    logout();
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-950/40 text-red-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>විසන්ධි වන්න (Logout)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Search Input */}
      {isSearching && (
        <div className="px-4 pb-3 pt-1">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="පණිවිඩ, පෝස්ට් හෝ මිතුරන් සොයන්න..."
              className="w-full pl-9 pr-4 py-2 bg-[#1c1c23] border border-[#27272e] text-white placeholder-gray-500 rounded-xl text-xs focus:outline-none focus:border-[#e11d48]"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
};

// ==========================================
// NAVIGATION TABS (CHATS, NEWS, FEED, STATUS, CALLS)
// ==========================================
interface NavigationTabsProps {
  activeTab: MainTab;
  onTabChange: (tab: MainTab) => void;
  unreadCount: number;
  hasNewStatus: boolean;
  missedCallsCount: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  unreadCount,
  hasNewStatus,
  missedCallsCount,
}) => {
  return (
    <nav className="bg-[#121216] border-b border-[#27272e] text-white shadow select-none">
      <div className="flex">
        {/* Chats Tab */}
        <button
          type="button"
          onClick={() => onTabChange('chats')}
          className={`flex-1 py-3 px-1 text-center text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 relative cursor-pointer transition-colors ${
            activeTab === 'chats' ? 'text-[#e11d48]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>චැට්</span>
          {unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#e11d48] text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
          {activeTab === 'chats' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e11d48] rounded-t-full shadow-red-glow" />
          )}
        </button>

        {/* Live News Tab */}
        <button
          type="button"
          onClick={() => onTabChange('news')}
          className={`flex-1 py-3 px-1 text-center text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 relative cursor-pointer transition-colors ${
            activeTab === 'news' ? 'text-[#e11d48]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span>පුවත්</span>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {activeTab === 'news' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e11d48] rounded-t-full shadow-red-glow" />
          )}
        </button>

        {/* Social Feed Tab */}
        <button
          type="button"
          onClick={() => onTabChange('feed')}
          className={`flex-1 py-3 px-1 text-center text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 relative cursor-pointer transition-colors ${
            activeTab === 'feed' ? 'text-[#e11d48]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Feed</span>
          {activeTab === 'feed' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e11d48] rounded-t-full shadow-red-glow" />
          )}
        </button>

        {/* Status Tab */}
        <button
          type="button"
          onClick={() => onTabChange('status')}
          className={`flex-1 py-3 px-1 text-center text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 relative cursor-pointer transition-colors ${
            activeTab === 'status' ? 'text-[#e11d48]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <CircleDashed className="w-4 h-4" />
          <span>තත්ත්ව</span>
          {hasNewStatus && (
            <span className="w-2 h-2 rounded-full bg-red-500" />
          )}
          {activeTab === 'status' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e11d48] rounded-t-full shadow-red-glow" />
          )}
        </button>

        {/* Calls Tab */}
        <button
          type="button"
          onClick={() => onTabChange('calls')}
          className={`flex-1 py-3 px-1 text-center text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 relative cursor-pointer transition-colors ${
            activeTab === 'calls' ? 'text-[#e11d48]' : 'text-gray-400 hover:text-white'
          }`}
        >
          <PhoneCall className="w-4 h-4" />
          <span>ඇමතුම්</span>
          {missedCallsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
              {missedCallsCount}
            </span>
          )}
          {activeTab === 'calls' && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#e11d48] rounded-t-full shadow-red-glow" />
          )}
        </button>
      </div>
    </nav>
  );
};

// ==========================================
// CHAT LIST COMPONENT (NO FAKE CHATS)
// ==========================================
interface ChatListProps {
  users: UserProfile[];
  groups: Chat[];
  messages: Message[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onOpenNewChatModal: () => void;
  searchQuery: string;
}

export const ChatList: React.FC<ChatListProps> = ({
  users,
  groups,
  messages,
  activeChatId,
  onSelectChat,
  onOpenNewChatModal,
  searchQuery,
}) => {
  const { currentUser } = useAuth();
  const otherUsers = users.filter((u) => u.id !== currentUser?.id);

  const getConversationDetails = (convId: string, isGroup: boolean) => {
    const relevantMsgs = messages.filter((m) => {
      if (isGroup) {
        return m.receiverId === convId;
      }
      return (
        (m.senderId === currentUser?.id && m.receiverId === convId) ||
        (m.senderId === convId && m.receiverId === currentUser?.id)
      );
    });

    const lastMsg = relevantMsgs.length > 0 ? relevantMsgs[relevantMsgs.length - 1] : null;
    const unreadCount = relevantMsgs.filter(
      (m) => m.senderId === convId && m.receiverId === currentUser?.id && m.status !== 'seen'
    ).length;

    return { lastMsg, unreadCount };
  };

  const chatItems = [
    ...groups.map((grp) => {
      const { lastMsg, unreadCount } = getConversationDetails(grp.id, true);
      return {
        id: grp.id,
        isGroup: true,
        name: grp.name,
        avatar: grp.avatar,
        isOnline: false,
        isVerified: false,
        isAiBot: false,
        lastMsg,
        unreadCount,
        timestamp: lastMsg?.timestamp || 0,
        phone: undefined as string | undefined,
      };
    }),
    ...otherUsers.map((usr) => {
      const { lastMsg, unreadCount } = getConversationDetails(usr.id, false);
      return {
        id: usr.id,
        isGroup: false,
        name: usr.name,
        avatar: usr.avatar,
        isOnline: usr.isOnline,
        isVerified: usr.isVerified,
        isAiBot: usr.id === ZAVI_AI_BOT_USER.id,
        lastMsg,
        unreadCount,
        timestamp: lastMsg?.timestamp || (usr.id === ZAVI_AI_BOT_USER.id ? 100 : 0),
        phone: usr.phone,
      };
    }),
  ];

  chatItems.sort((a, b) => b.timestamp - a.timestamp);

  const filteredItems = searchQuery
    ? chatItems.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.phone && c.phone.includes(searchQuery)) ||
          (c.lastMsg?.text && c.lastMsg.text.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chatItems;

  return (
    <div className="relative h-full flex flex-col bg-[#09090b] overflow-y-auto">
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8 text-center text-gray-500">
          <div className="w-16 h-16 rounded-full bg-[#1c1c23] border border-[#27272e] flex items-center justify-center text-[#e11d48] mb-3 shadow-red-glow">
            <MessageSquarePlus className="w-8 h-8" />
          </div>
          <p className="font-bold text-gray-200">
            පණිවිඩ කිසිවක් හමු නොවීය
          </p>
          <p className="text-xs mt-1 text-gray-400 max-w-xs">
            නව චැට් එකක් ආරම්භ කිරීමට පහත ඇති රතු පැහැති බොත්තම ඔබන්න.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#1e1e24] pb-24">
          {filteredItems.map((item) => {
            const isSelected = activeChatId === item.id;
            const isMyLastMsg = item.lastMsg?.senderId === currentUser?.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectChat(item.id)}
                className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors cursor-pointer select-none ${
                  isSelected
                    ? 'bg-[#1c1c23] border-l-4 border-[#e11d48]'
                    : 'hover:bg-[#141418]'
                }`}
              >
                {/* Avatar with Online / Verified Badge */}
                <div className="relative shrink-0">
                  <img
                    src={item.avatar}
                    alt={item.name}
                    className="w-12 h-12 rounded-full object-cover shadow-sm bg-gray-800 ring-1 ring-[#27272e]"
                  />
                  {item.isOnline && !item.isGroup && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-[#09090b]" />
                  )}
                  {item.isGroup && (
                    <span className="absolute bottom-0 right-0 w-4 h-4 bg-[#e11d48] text-white rounded-full flex items-center justify-center ring-2 ring-[#09090b]">
                      <Users className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>

                {/* Info & Last message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <h3 className="font-bold text-white text-[15px] truncate">
                        {item.name}
                      </h3>
                      {item.isVerified && <VerifiedBadge size={14} />}
                      {item.isAiBot && (
                        <span className="text-[10px] bg-red-950/60 text-[#e11d48] border border-red-800/60 px-1.5 py-0.2 rounded font-mono font-bold">
                          AI
                        </span>
                      )}
                    </div>
                    {item.lastMsg && (
                      <span
                        className={`text-[11px] ${
                          item.unreadCount > 0
                            ? 'text-[#e11d48] font-bold'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatDateOrTime(item.lastMsg.timestamp)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate">
                      {isMyLastMsg && item.lastMsg && (
                        <span>
                          {item.lastMsg.status === 'seen' ? (
                            <CheckCheck className="w-4 h-4 text-sky-400 shrink-0 inline" />
                          ) : item.lastMsg.status === 'delivered' ? (
                            <CheckCheck className="w-4 h-4 text-gray-500 shrink-0 inline" />
                          ) : (
                            <Check className="w-4 h-4 text-gray-500 shrink-0 inline" />
                          )}
                        </span>
                      )}

                      {item.lastMsg ? (
                        item.lastMsg.type === 'call_log' ? (
                          <span className="text-red-400 font-medium truncate">
                            {item.lastMsg.text}
                          </span>
                        ) : item.lastMsg.type === 'image' ? (
                          <span className="flex items-center gap-1 text-gray-300">
                            <ImageIcon className="w-3.5 h-3.5 text-red-400" />
                            <span>ඡායාරූපයක් (Photo)</span>
                          </span>
                        ) : item.lastMsg.type === 'voice' ? (
                          <span className="flex items-center gap-1 text-gray-300">
                            <Mic className="w-3.5 h-3.5 text-red-400" />
                            <span>හඬ පණිවිඩය ({item.lastMsg.duration || 1}s)</span>
                          </span>
                        ) : (
                          <span className="truncate text-gray-300">{item.lastMsg.text}</span>
                        )
                      ) : item.isAiBot ? (
                        <span className="text-gray-400 text-xs italic">
                          "මම Zavi AI. ප්‍රශ්නයක් අසන්න..."
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs italic">
                          {item.isGroup ? 'නව සමූහය' : 'පණිවිඩයක් යවන්න...'}
                        </span>
                      )}
                    </div>

                    {item.unreadCount > 0 && (
                      <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-[#e11d48] text-white text-[10px] font-bold flex items-center justify-center shadow-red-glow">
                        {item.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={onOpenNewChatModal}
        title="නව පණිවිඩයක්"
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-[#be123c] to-[#e11d48] hover:from-[#e11d48] hover:to-[#f43f5e] active:scale-95 text-white rounded-2xl shadow-xl shadow-red-950/50 flex items-center justify-center transition-all cursor-pointer z-20 shadow-red-glow"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>

      {/* WhatsApp Data package note */}
      <div className="py-4 text-center text-[11px] text-gray-500 flex items-center justify-center gap-1.5">
        <Lock className="w-3 h-3 text-[#e11d48]" />
        <span>Zavi Chats • WhatsApp Data පැකේජ් සඳහා සුදුසු පරිදි සකසා ඇත</span>
      </div>
    </div>
  );
};

// ==========================================
// CHAT ROOM COMPONENT (PIN, REACT, DELETE, FORWARD, REPORT)
// ==========================================
interface ChatRoomProps {
  chat: Chat;
  chatUser: UserProfile | null;
  onBack: () => void;
  onOpenProfile: (user: UserProfile) => void;
  onOpenReportModal: (user: UserProfile) => void;
  onForwardMessageModal: (msg: Message) => void;
}

export const ChatRoom: React.FC<ChatRoomProps> = ({
  chat,
  chatUser,
  onBack,
  onOpenProfile,
  onOpenReportModal,
  onForwardMessageModal,
}) => {
  const { currentUser, toggleBlockUser } = useAuth();
  const { 
    messages, 
    sendTextMessage, 
    sendImageMessage, 
    sendVoiceMessage, 
    pinMessage,
    deleteMessage,
    reactToMessage,
    initiateCall, 
    typingUserIds,
    clearChatHistory 
  } = useChat();

  const [inputText, setInputText] = useState('');
  const [showEmojiKeyboard, setShowEmojiKeyboard] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedMessageForAction, setSelectedMessageForAction] = useState<Message | null>(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const conversationMessages = messages.filter((m) => {
    if (chat.isGroup) {
      return m.receiverId === chat.id;
    }
    return (
      (m.senderId === currentUser?.id && m.receiverId === chat.id) ||
      (m.senderId === chat.id && m.receiverId === currentUser?.id)
    );
  });

  const pinnedMessage = conversationMessages.find(m => m.pinned);
  const isBlocked = chatUser && currentUser?.blockedUsers?.includes(chatUser.id);
  const isTyping = chatUser && typingUserIds.includes(chatUser.id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages.length, isTyping]);

  const handleSendText = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    setShowEmojiKeyboard(false);
    await sendTextMessage(text);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await sendImageMessage(base64);
        setShowAttachMenu(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartRecording = async () => {
    const started = await startAudioRecording();
    if (started) {
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    }
  };

  const handleStopRecordingAndSend = async () => {
    if (!isRecording) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    const audioData = await stopAudioRecording();
    if (audioData) {
      await sendVoiceMessage(audioData.audioUrl, audioData.duration);
    }
  };

  const handleCancelRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);
    await stopAudioRecording();
  };

  const handlePlayVoice = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = url;
        audioPlayerRef.current.play();
        setPlayingAudioId(msgId);
        audioPlayerRef.current.onended = () => {
          setPlayingAudioId(null);
        };
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] relative select-none">
      <audio ref={audioPlayerRef} className="hidden" />

      {/* Top Header Bar */}
      <div className="bg-[#121216] border-b border-[#27272e] text-white px-3 py-2.5 flex items-center justify-between shadow z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded-xl hover:bg-white/5 active:bg-white/10 text-white cursor-pointer"
            title="ආපසු"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            onClick={() => chatUser && onOpenProfile(chatUser)}
          >
            <img
              src={chat.avatar}
              alt={chat.name}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48] shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <h2 className="font-bold text-sm text-white truncate">{chat.name}</h2>
                {chat.isVerified && <VerifiedBadge size={14} />}
                {chat.isAiBot && (
                  <span className="text-[9px] bg-red-950/60 text-[#e11d48] border border-red-800 px-1 rounded font-mono font-bold">
                    AI
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 truncate">
                {isTyping ? (
                  <span className="text-red-400 animate-pulse font-medium">ටයිප් කරමින් සිටී...</span>
                ) : chat.isGroup ? (
                  `${chat.participantIds.length} සාමාජිකයන්`
                ) : chatUser?.isOnline ? (
                  <span className="text-emerald-400">සබැඳිව ඇත (Online)</span>
                ) : (
                  `අවසන් වරට: ${chatUser ? formatDateOrTime(chatUser.lastSeen) : ''}`
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Call & Menu Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {!chat.isGroup && chatUser && !chat.isAiBot && (
            <>
              <button
                type="button"
                onClick={() => initiateCall(chatUser, 'video')}
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Video Call"
              >
                <Video className="w-5 h-5 text-red-400" />
              </button>
              <button
                type="button"
                onClick={() => initiateCall(chatUser, 'voice')}
                className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Voice Call"
              >
                <Phone className="w-5 h-5 text-red-400" />
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown((p) => !p)}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="විකල්ප"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#1a1a21] rounded-2xl shadow-2xl py-1.5 border border-[#27272e] text-white text-sm z-50">
                {chatUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onOpenProfile(chatUser);
                    }}
                    className="w-full px-4 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Profile එක බලන්න
                  </button>
                )}

                {chatUser && !chat.isGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      onOpenReportModal(chatUser);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-red-950/40 text-amber-400 transition-colors cursor-pointer"
                  >
                    <Flag className="w-4 h-4 text-amber-400" />
                    <span>Report කරන්න (Admin ට යැවීම)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    clearChatHistory(chat.id);
                  }}
                  className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-white/5 text-gray-300 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>පණිවිඩ මකා දමන්න (Clear)</span>
                </button>

                {chatUser && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      toggleBlockUser(chatUser.id);
                    }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 hover:bg-red-950/40 text-red-400 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    <span>{isBlocked ? 'Unblock කරන්න' : 'Block කරන්න'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pinned Message Banner */}
      {pinnedMessage && (
        <div className="bg-[#1c1c24] border-b border-[#27272e] px-4 py-2 flex items-center justify-between text-xs text-gray-200 z-10">
          <div className="flex items-center gap-2 truncate">
            <Pin className="w-3.5 h-3.5 text-[#e11d48] shrink-0" />
            <span className="font-semibold text-red-400 shrink-0">Pinned:</span>
            <span className="truncate">{pinnedMessage.text || 'ඡායාරූපයක්'}</span>
          </div>
          <button
            type="button"
            onClick={() => pinMessage(pinnedMessage.id, false)}
            className="text-gray-400 hover:text-white p-1"
            title="Unpin"
          >
            <PinOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 vip-wallpaper-dark">
        {/* Security badge */}
        <div className="flex justify-center my-1">
          <div className="bg-[#14141a]/90 text-gray-400 text-[11px] px-3.5 py-1 rounded-full shadow border border-[#27272e] text-center">
            🔒 Zavi Chats End-to-End Encrypted • VIP Secured
          </div>
        </div>

        {conversationMessages.map((msg) => {
          const isMe = msg.senderId === currentUser?.id;

          // Call log special bubble
          if (msg.type === 'call_log') {
            const isMissed = msg.callInfo?.status === 'missed';
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className={`px-4 py-1.5 rounded-2xl text-xs flex items-center gap-2 border ${
                  isMissed 
                    ? 'bg-red-950/40 border-red-800/60 text-red-300' 
                    : 'bg-[#1c1c24] border-[#27272e] text-gray-300'
                }`}>
                  <Phone className="w-3.5 h-3.5 text-red-400" />
                  <span>{msg.text}</span>
                  <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-md text-sm relative ${
                  isMe
                    ? 'bg-gradient-to-r from-[#991b1b] to-[#be123c] text-white rounded-tr-none'
                    : 'bg-[#1a1a21] text-gray-100 border border-[#27272e] rounded-tl-none'
                }`}
              >
                {/* Forwarded label */}
                {msg.isForwarded && (
                  <p className="text-[10px] text-white/70 italic flex items-center gap-1 mb-0.5">
                    <Forward className="w-3 h-3" />
                    <span>Forwarded</span>
                  </p>
                )}

                {/* Group sender name */}
                {chat.isGroup && !isMe && (
                  <p className="text-[11px] font-bold text-red-400 mb-0.5">
                    {msg.senderName}
                  </p>
                )}

                {/* Text Message */}
                {msg.type === 'text' && (
                  <p className="whitespace-pre-wrap break-words leading-relaxed text-[14px]">
                    {msg.text}
                  </p>
                )}

                {/* Image Message */}
                {msg.type === 'image' && msg.mediaUrl && (
                  <div className="rounded-xl overflow-hidden mb-1 cursor-pointer">
                    <img
                      src={msg.mediaUrl}
                      alt="Attachment"
                      className="max-h-72 w-full object-cover rounded-xl hover:opacity-95 transition-opacity"
                      onClick={() => setPreviewImage(msg.mediaUrl || null)}
                    />
                  </div>
                )}

                {/* Voice Message */}
                {msg.type === 'voice' && msg.mediaUrl && (
                  <div className="flex items-center gap-3 py-1 min-w-[210px]">
                    <button
                      type="button"
                      onClick={() => handlePlayVoice(msg.id, msg.mediaUrl!)}
                      className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                    >
                      {playingAudioId === msg.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-0.5 h-6">
                        {[40, 70, 30, 90, 60, 45, 80, 50, 75, 30, 65, 85, 40].map((h, i) => (
                          <span
                            key={i}
                            style={{ height: `${h}%` }}
                            className={`w-1 rounded-full ${
                              playingAudioId === msg.id
                                ? 'bg-white animate-pulse'
                                : 'bg-white/40'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-white/70 mt-0.5">
                        <span>{playingAudioId === msg.id ? 'වාදනය වේ...' : 'හඬ පණිවිඩය'}</span>
                        <span>{msg.duration || 1}s</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time & Read Receipts */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-white/70 mt-1 select-none">
                  {msg.pinned && <Pin className="w-3 h-3 text-amber-300" />}
                  <span>{formatTime(msg.timestamp)}</span>
                  {isMe && (
                    <span>
                      {msg.status === 'seen' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-400 inline" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white/50 inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white/50 inline" />
                      )}
                    </span>
                  )}
                </div>

                {/* Reactions badge */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(msg.reactions).map(([emoji, uids]) => (
                      <span
                        key={emoji}
                        onClick={() => reactToMessage(msg.id, emoji)}
                        className="px-1.5 py-0.5 bg-black/40 rounded-full text-xs flex items-center gap-1 border border-white/10 cursor-pointer"
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] text-white/80">{uids.length}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Quick Actions (React, Pin, Forward, Delete) */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 my-1 px-1 bg-[#141418] rounded-xl border border-[#27272e] shadow-lg">
                <button
                  type="button"
                  onClick={() => reactToMessage(msg.id, '❤️')}
                  className="p-1 text-sm hover:scale-125 transition-transform cursor-pointer"
                  title="Love"
                >
                  ❤️
                </button>
                <button
                  type="button"
                  onClick={() => reactToMessage(msg.id, '👍')}
                  className="p-1 text-sm hover:scale-125 transition-transform cursor-pointer"
                  title="Like"
                >
                  👍
                </button>
                <button
                  type="button"
                  onClick={() => reactToMessage(msg.id, '🔥')}
                  className="p-1 text-sm hover:scale-125 transition-transform cursor-pointer"
                  title="Fire"
                >
                  🔥
                </button>
                <button
                  type="button"
                  onClick={() => pinMessage(msg.id, !msg.pinned)}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                  title={msg.pinned ? 'Unpin' : 'Pin Message'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onForwardMessageModal(msg)}
                  className="p-1 text-gray-400 hover:text-white cursor-pointer"
                  title="Forward Message"
                >
                  <Forward className="w-3.5 h-3.5" />
                </button>
                {isMe && (
                  <button
                    type="button"
                    onClick={() => deleteMessage(msg.id)}
                    className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                    title="Delete Message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#1a1a21] border border-[#27272e] rounded-2xl w-fit shadow-sm text-xs text-gray-400 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-[#e11d48] animate-bounce [animation-delay:0.4s]" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Full Category Emoji Keyboard */}
      {showEmojiKeyboard && (
        <EmojiKeyboard
          onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
          onClose={() => setShowEmojiKeyboard(false)}
        />
      )}

      {/* Attachment Tray */}
      {showAttachMenu && (
        <div className="p-3 bg-[#141418] border-t border-[#27272e] flex gap-4">
          <label className="flex flex-col items-center gap-1 cursor-pointer">
            <div className="w-12 h-12 bg-[#be123c] text-white rounded-2xl flex items-center justify-center shadow hover:opacity-90">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span className="text-[11px] text-gray-300">ඡායාරූප (Photo)</span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>
      )}

      {/* Input Bar */}
      <div className="p-2.5 sm:p-3 bg-[#121216] border-t border-[#27272e] flex items-center gap-2">
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between px-4 py-2 bg-red-950/60 rounded-2xl border border-red-800 animate-pulse">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs sm:text-sm">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-record" />
              <span>හඬ පටිගත වේ: {recordingSeconds}s</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelRecording}
                className="text-xs text-gray-400 hover:text-red-400 cursor-pointer"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="button"
                onClick={handleStopRecordingAndSend}
                className="p-1.5 bg-[#e11d48] text-white rounded-full shadow hover:bg-[#be123c] cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setShowEmojiKeyboard(p => !p)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer"
              title="ඉමෝජි කීබෝඩ් එක"
            >
              <Smile className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => setShowAttachMenu(p => !p)}
              className="p-2 text-gray-400 hover:text-white cursor-pointer"
              title="ෆයිල් එකතු කරන්න"
            >
              <Paperclip className="w-6 h-6" />
            </button>

            <form onSubmit={handleSendText} className="flex-1 flex items-center">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="පණිවිඩයක් ලියන්න..."
                className="w-full px-4 py-2.5 rounded-full bg-[#1a1a21] border border-[#27272e] text-white text-sm focus:outline-none focus:border-[#e11d48]"
              />
            </form>

            {inputText.trim() ? (
              <button
                type="button"
                onClick={() => handleSendText()}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0 cursor-pointer shadow-red-glow"
                title="යවන්න"
              >
                <Send className="w-5 h-5 ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform shrink-0 cursor-pointer shadow-red-glow"
                title="හඬ පණිවිඩය"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </>
        )}
      </div>

      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-center items-center p-4">
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Preview"
            className="max-h-[85vh] max-w-[95vw] object-contain rounded-xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};

// ==========================================
// STATUS VIEW COMPONENT (EXPIRATION & REACTIONS)
// ==========================================
const STATUS_BACKGROUNDS = [
  '#09090b',
  '#991b1b',
  '#be123c',
  '#4c0519',
  '#1e1b4b',
  '#18181b',
];

export const StatusView: React.FC = () => {
  const { currentUser } = useAuth();
  const { statuses, postStatus, reactToStatus } = useChat();

  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [activeStoryList, setActiveStoryList] = useState<StatusItem[]>([]);
  const [showTextStatusModal, setShowTextStatusModal] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [selectedBg, setSelectedBg] = useState(STATUS_BACKGROUNDS[0]);

  const myStatuses = statuses.filter((s) => s.userId === currentUser?.id);
  const otherStatuses = statuses.filter((s) => s.userId !== currentUser?.id);

  const groupedByUser = otherStatuses.reduce<Record<string, StatusItem[]>>((acc, item) => {
    if (!acc[item.userId]) acc[item.userId] = [];
    acc[item.userId].push(item);
    return acc;
  }, {});

  useEffect(() => {
    if (activeStoryIndex === null) return;
    const timer = setTimeout(() => {
      if (activeStoryIndex < activeStoryList.length - 1) {
        setActiveStoryIndex((prev) => (prev !== null ? prev + 1 : null));
      } else {
        setActiveStoryIndex(null);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [activeStoryIndex, activeStoryList]);

  const handlePostTextStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusText.trim()) return;
    await postStatus('text', statusText.trim(), '', selectedBg, '#ffffff');
    setStatusText('');
    setShowTextStatusModal(false);
  };

  const handlePhotoStatusUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        await postStatus('image', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const openStories = (items: StatusItem[]) => {
    setActiveStoryList(items);
    setActiveStoryIndex(0);
  };

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      
      {/* My Status */}
      <div className="p-4 flex items-center justify-between border-b border-[#1e1e24]">
        <div
          className="flex items-center gap-3.5 cursor-pointer flex-1"
          onClick={() => {
            if (myStatuses.length > 0) openStories(myStatuses);
            else setShowTextStatusModal(true);
          }}
        >
          <div className="relative">
            <img
              src={currentUser?.avatar}
              alt="My Avatar"
              className={`w-14 h-14 rounded-full object-cover ring-2 ${
                myStatuses.length > 0 ? 'ring-[#e11d48] ring-offset-2 ring-offset-black' : 'ring-[#27272e]'
              }`}
            />
            {myStatuses.length === 0 && (
              <span className="absolute bottom-0 right-0 w-5 h-5 bg-[#e11d48] text-white rounded-full flex items-center justify-center ring-2 ring-black">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </span>
            )}
          </div>

          <div>
            <h3 className="font-bold text-white text-sm">
              මගේ තත්ත්වය (My Status)
            </h3>
            <p className="text-xs text-gray-400">
              {myStatuses.length > 0
                ? `${myStatuses.length} තත්ත්ව ඇත • බැලීමට ඔබන්න`
                : 'පැය 24 කින් ඉවත් වන Status එකක් දමන්න'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowTextStatusModal(true)}
            className="p-2.5 rounded-full bg-[#1c1c23] hover:bg-[#252530] text-gray-200 border border-[#27272e] cursor-pointer"
            title="Text Status"
          >
            <Edit3 className="w-4 h-4 text-[#e11d48]" />
          </button>

          <label className="p-2.5 rounded-full bg-[#1c1c23] hover:bg-[#252530] text-gray-200 border border-[#27272e] cursor-pointer">
            <Camera className="w-4 h-4 text-[#e11d48]" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoStatusUpload}
            />
          </label>
        </div>
      </div>

      {/* Recent Updates Header */}
      <div className="px-4 py-2.5 bg-[#121216] border-b border-[#1e1e24]">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          මෑත යාවත්කාලීන (Recent Updates)
        </p>
      </div>

      {/* List */}
      <div className="divide-y divide-[#1e1e24]">
        {Object.keys(groupedByUser).length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            <p>දැනට මිතුරන්ගේ Status නොමැත. ඔබේ Status එකක් පළ කරන්න!</p>
          </div>
        ) : (
          Object.entries(groupedByUser).map(([userId, userStatuses]) => {
            const first = userStatuses[0];
            return (
              <div
                key={userId}
                onClick={() => openStories(userStatuses)}
                className="flex items-center gap-3.5 px-4 py-3 hover:bg-[#141418] transition-colors cursor-pointer"
              >
                <div className="relative">
                  <img
                    src={first.userAvatar}
                    alt={first.userName}
                    className="w-13 h-13 rounded-full object-cover ring-2 ring-[#e11d48] ring-offset-2 ring-offset-black"
                  />
                  {userStatuses.length > 1 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-[#e11d48] text-white text-[10px] font-bold">
                      {userStatuses.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-bold text-white text-sm truncate">
                      {first.userName}
                    </h4>
                    {first.isVerified && <VerifiedBadge size={13} />}
                  </div>
                  <p className="text-xs text-gray-400">
                    {formatDateOrTime(first.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TEXT STATUS CREATION MODAL */}
      {showTextStatusModal && (
        <div 
          className="fixed inset-0 z-50 flex flex-col justify-between p-6 animate-in fade-in" 
          style={{ backgroundColor: selectedBg }}
        >
          <div className="flex items-center justify-between text-white">
            <button
              type="button"
              onClick={() => setShowTextStatusModal(false)}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-full border border-white/20">
              {STATUS_BACKGROUNDS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedBg(bg)}
                  style={{ backgroundColor: bg }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    selectedBg === bg ? 'border-white scale-125' : 'border-transparent opacity-60'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center max-w-lg mx-auto w-full">
            <textarea
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="තත්ත්වයක් ලියන්න..."
              rows={4}
              className="w-full text-center text-white placeholder-white/40 bg-transparent text-2xl sm:text-3xl font-bold focus:outline-none resize-none leading-relaxed"
              autoFocus
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePostTextStatus}
              disabled={!statusText.trim()}
              className="w-14 h-14 rounded-full bg-[#e11d48] hover:bg-[#be123c] text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform disabled:opacity-40 cursor-pointer shadow-red-glow"
            >
              <Check className="w-7 h-7" />
            </button>
          </div>
        </div>
      )}

      {/* FULL-SCREEN STORY VIEWER WITH STATUS REACTIONS */}
      {activeStoryIndex !== null && activeStoryList[activeStoryIndex] && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4 select-none">
          {/* Progress Indicators */}
          <div className="flex gap-1.5 pt-2">
            {activeStoryList.map((_, i) => (
              <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-[#e11d48] transition-all duration-300 ${
                    i < activeStoryIndex ? 'w-full' : i === activeStoryIndex ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Story Header */}
          <div className="flex items-center justify-between text-white py-2">
            <div className="flex items-center gap-3">
              <img
                src={activeStoryList[activeStoryIndex].userAvatar}
                alt="User"
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[#e11d48]"
              />
              <div>
                <div className="flex items-center gap-1">
                  <p className="font-bold text-sm">
                    {activeStoryList[activeStoryIndex].userName}
                  </p>
                  {activeStoryList[activeStoryIndex].isVerified && <VerifiedBadge size={13} />}
                </div>
                <p className="text-[11px] text-gray-400">
                  {formatDateOrTime(activeStoryList[activeStoryIndex].timestamp)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveStoryIndex(null)}
              className="p-2 rounded-full hover:bg-white/10 text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Story Content */}
          <div
            className="flex-1 rounded-3xl overflow-hidden flex items-center justify-center p-6 relative border border-[#27272e]"
            style={
              activeStoryList[activeStoryIndex].type === 'text'
                ? { backgroundColor: activeStoryList[activeStoryIndex].backgroundColor || '#09090b' }
                : { backgroundColor: '#000000' }
            }
          >
            <div
              className="absolute inset-y-0 left-0 w-1/3 cursor-pointer z-10"
              onClick={() => {
                if (activeStoryIndex > 0) setActiveStoryIndex(activeStoryIndex - 1);
              }}
            />
            <div
              className="absolute inset-y-0 right-0 w-1/3 cursor-pointer z-10"
              onClick={() => {
                if (activeStoryIndex < activeStoryList.length - 1) setActiveStoryIndex(activeStoryIndex + 1);
                else setActiveStoryIndex(null);
              }}
            />

            {activeStoryList[activeStoryIndex].type === 'text' ? (
              <p className="text-white text-2xl sm:text-3xl font-black text-center leading-relaxed max-w-md">
                {activeStoryList[activeStoryIndex].content}
              </p>
            ) : (
              <img
                src={activeStoryList[activeStoryIndex].content}
                alt="Story"
                className="max-h-full max-w-full object-contain rounded-2xl"
              />
            )}
          </div>

          {/* Quick Reaction Bar */}
          <div className="py-2.5 flex items-center justify-between gap-2 max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
              {['❤️', '🔥', '😂', '👏', '😮', '😢'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    reactToStatus(activeStoryList[activeStoryIndex].id, emoji);
                  }}
                  className="text-xl p-1 hover:scale-125 transition-transform cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>පැය 24 කින් ඉවත් වේ</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// HIRU NEWS LIVE FEED VIEW
// ==========================================
export const HiruNewsView: React.FC = () => {
  const { news, isLoadingNews, refreshNews, setActiveChatId } = useChat();

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-red-glow">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-black text-white text-sm">Hiru News Live</h3>
              <VerifiedBadge size={14} />
            </div>
            <p className="text-[11px] text-gray-400">සජීවී දේශීය සහ විදේශීය පුවත් සංග්‍රහය</p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshNews}
          disabled={isLoadingNews}
          className="p-2 bg-[#1c1c23] hover:bg-[#252530] text-red-400 rounded-xl border border-[#27272e] cursor-pointer"
          title="යාවත්කාලීන කරන්න"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingNews ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* News List */}
      <div className="p-4 space-y-4">
        {isLoadingNews ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-xs">
            <RefreshCw className="w-6 h-6 animate-spin text-[#e11d48] mb-2" />
            <p>නවතම පුවත් ලබා ගනිමින් පවතී...</p>
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-xs">
            <p>පුවත් කිසිවක් හමු නොවීය.</p>
          </div>
        ) : (
          news.map((item) => (
            <article
              key={item.id}
              className="bg-[#141418] border border-[#27272e] rounded-2xl overflow-hidden shadow-lg hover:border-[#e11d48]/40 transition-colors"
            >
              {item.imageUrl && (
                <div className="w-full h-44 overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 bg-red-600 text-white font-bold text-[10px] rounded-md shadow">
                    {item.category || 'Hiru News'}
                  </span>
                </div>
              )}

              <div className="p-3.5">
                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 font-bold">Hiru News Channel</span>
                    <VerifiedBadge size={12} />
                  </div>
                  <span>{item.publishedAt}</span>
                </div>

                <h4 className="font-bold text-white text-sm leading-snug mb-2">
                  {item.title}
                </h4>

                <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed mb-3">
                  {item.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#1e1e24]">
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#e11d48] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>සම්පූර්ණ පුවත කියවන්න</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : <span />}

                  <button
                    type="button"
                    onClick={() => {
                      // Share to AI bot or chat
                      alert(`"${item.title}" පුවත Zavi Chats හරහා බෙදා ගන්නා ලදී.`);
                    }}
                    className="px-2.5 py-1 bg-[#1c1c23] hover:bg-[#252530] text-gray-300 rounded-lg text-xs flex items-center gap-1 border border-[#27272e] cursor-pointer"
                  >
                    <Share2 className="w-3 h-3 text-[#e11d48]" />
                    <span>බෙදාගන්න</span>
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
};

// ==========================================
// SOCIAL FEED VIEW (FACEBOOK-STYLE POSTS & VIDEOS)
// ==========================================
export const SocialFeedView: React.FC = () => {
  const { currentUser } = useAuth();
  const { posts, createSocialPost, reactToSocialPost, addCommentToPost } = useChat();

  const [postText, setPostText] = useState('');
  const [postMediaUrl, setPostMediaUrl] = useState('');
  const [postMediaType, setPostMediaType] = useState<'image' | 'video'>('image');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !postMediaUrl.trim()) return;
    await createSocialPost(
      postText.trim(),
      postMediaUrl.trim() || undefined,
      postMediaUrl.trim() ? postMediaType : undefined
    );
    setPostText('');
    setPostMediaUrl('');
    setShowMediaInput(false);
  };

  const handleSendComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;
    await addCommentToPost(postId, text.trim());
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      
      {/* Create Post Box */}
      <div className="p-4 bg-[#141418] border-b border-[#27272e]">
        <div className="flex gap-3 items-start">
          <img
            src={currentUser?.avatar}
            alt={currentUser?.name}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48] shrink-0"
          />
          <div className="flex-1">
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder={`${currentUser?.name || ''}, ඔබ සිතන්නේ කුමක්ද? (What's on your mind?)...`}
              rows={2}
              className="w-full bg-[#1c1c23] border border-[#27272e] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48] resize-none"
            />

            {showMediaInput && (
              <div className="mt-2 space-y-2 p-2 bg-[#18181f] rounded-xl border border-[#27272e]">
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setPostMediaType('image')}
                    className={`px-2.5 py-1 rounded-lg ${postMediaType === 'image' ? 'bg-[#e11d48] text-white font-bold' : 'text-gray-400'}`}
                  >
                    Image Link / File
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostMediaType('video')}
                    className={`px-2.5 py-1 rounded-lg ${postMediaType === 'video' ? 'bg-[#e11d48] text-white font-bold' : 'text-gray-400'}`}
                  >
                    Video Link
                  </button>
                </div>
                <input
                  type="text"
                  value={postMediaUrl}
                  onChange={(e) => setPostMediaUrl(e.target.value)}
                  placeholder="https://... ඡායාරූප හෝ වීඩියෝ URL එක ඇතුළත් කරන්න"
                  className="w-full bg-[#121216] border border-[#27272e] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#e11d48]"
                />
              </div>
            )}

            <div className="flex items-center justify-between mt-2.5">
              <button
                type="button"
                onClick={() => setShowMediaInput(p => !p)}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4 text-red-400" />
                <span>Photo / Video එකතු කරන්න</span>
              </button>

              <button
                type="button"
                onClick={handleCreatePost}
                disabled={!postText.trim() && !postMediaUrl.trim()}
                className="px-4 py-1.5 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer shadow-red-glow"
              >
                Post කරන්න
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="p-3 sm:p-4 space-y-4">
        {posts.map((post) => {
          const isLikedByMe = currentUser && post.likes?.includes(currentUser.id);
          const showComments = activeCommentsPostId === post.id;

          return (
            <div
              key={post.id}
              className="bg-[#141418] border border-[#27272e] rounded-2xl overflow-hidden shadow-lg"
            >
              {/* Post Author */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src={post.userAvatar}
                    alt={post.userName}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-white text-xs sm:text-sm">{post.userName}</h4>
                      {post.isVerified && <VerifiedBadge size={14} />}
                    </div>
                    <p className="text-[10px] text-gray-500">{formatDateOrTime(post.timestamp)}</p>
                  </div>
                </div>
              </div>

              {/* Text */}
              {post.text && (
                <div className="px-3.5 pb-2 text-xs sm:text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {post.text}
                </div>
              )}

              {/* Media */}
              {post.mediaUrl && (
                <div className="w-full max-h-96 overflow-hidden bg-black flex items-center justify-center">
                  {post.mediaType === 'video' ? (
                    <video
                      src={post.mediaUrl}
                      controls
                      className="max-h-96 w-full object-contain"
                    />
                  ) : (
                    <img
                      src={post.mediaUrl}
                      alt="Post Media"
                      className="max-h-96 w-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Counts */}
              <div className="px-3.5 py-2 flex items-center justify-between text-[11px] text-gray-500 border-b border-[#1e1e24]">
                <div className="flex items-center gap-1">
                  <span className="text-red-400">❤️</span>
                  <span>{post.likes?.length || 0} Likes</span>
                </div>
                <span>{post.comments?.length || 0} Comments</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-around py-1.5 bg-[#121216] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => reactToSocialPost(post.id, '❤️')}
                  className={`flex items-center gap-1.5 py-1 px-3 rounded-lg cursor-pointer ${
                    isLikedByMe ? 'text-[#e11d48] font-bold' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLikedByMe ? 'fill-[#e11d48]' : ''}`} />
                  <span>Like</span>
                </button>

                <button
                  type="button"
                  onClick={() => reactToSocialPost(post.id, '🔥')}
                  className="flex items-center gap-1.5 py-1 px-3 rounded-lg text-gray-400 hover:text-amber-400 cursor-pointer"
                >
                  <span>🔥 Fire</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveCommentsPostId(showComments ? null : post.id)}
                  className="flex items-center gap-1.5 py-1 px-3 rounded-lg text-gray-400 hover:text-white cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Comment</span>
                </button>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="p-3 bg-[#0e0e12] border-t border-[#1e1e24] space-y-2.5">
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {post.comments?.map((c) => (
                      <div key={c.id} className="flex gap-2 items-start text-xs">
                        <img
                          src={c.userAvatar}
                          alt={c.userName}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <div className="bg-[#18181f] p-2 rounded-xl border border-[#27272e] flex-1">
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-white text-[11px]">{c.userName}</span>
                            {c.isVerified && <VerifiedBadge size={11} />}
                          </div>
                          <p className="text-gray-300 mt-0.5">{c.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add comment */}
                  <div className="flex gap-2 items-center pt-1">
                    <input
                      type="text"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      placeholder="Comment එකක් ලියන්න..."
                      className="flex-1 bg-[#18181f] border border-[#27272e] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#e11d48]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendComment(post.id);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleSendComment(post.id)}
                      className="px-3 py-1.5 bg-[#e11d48] text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
