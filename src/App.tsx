import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Video, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  VideoOff, 
  X, 
  Search, 
  Users, 
  Check, 
  Camera, 
  Copy, 
  ShieldCheck, 
  Moon, 
  Sun, 
  LogOut, 
  ChevronRight,
  Crown,
  Info,
  Flag,
  Forward,
  Trash2,
  AlertTriangle,
  BadgeCheck,
  Sparkles,
  Heart,
  Send,
  UserCheck,
  UserX,
  FileText
} from 'lucide-react';

import type { UserProfile, Chat, CallRecord, Message } from './types.ts';
import { AuthProvider, useAuth, ChatProvider, useChat } from './context.tsx';
import { formatDateOrTime } from './audio.ts';
import { MASTER_ADMIN_PHONE, MASTER_ADMIN_NAME, ZAVI_AI_BOT_USER } from './firebase.ts';
import { 
  AuthScreen, 
  Header, 
  NavigationTabs, 
  type MainTab, 
  ChatList, 
  ChatRoom, 
  StatusView,
  HiruNewsView,
  SocialFeedView,
  VerifiedBadge
} from './components.tsx';

// ==========================================
// CALLS VIEW COMPONENT (VIP RED & BLACK THEME)
// ==========================================
const CallsView: React.FC<{ onOpenNewCall: () => void }> = ({ onOpenNewCall }) => {
  const { currentUser } = useAuth();
  const { callRecords, users, initiateCall } = useChat();

  const handleCallBack = (record: CallRecord) => {
    const isCallerMe = record.callerId === currentUser?.id;
    const targetId = isCallerMe ? record.receiverId : record.callerId;
    const targetUser = users.find((u) => u.id === targetId);
    if (targetUser) {
      initiateCall(targetUser, record.type);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `(${mins}m ${secs}s)`;
    return `(${secs}s)`;
  };

  return (
    <div className="h-full bg-[#09090b] overflow-y-auto pb-24 select-none">
      {callRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
          <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-800/40 flex items-center justify-center text-[#e11d48] mb-3 shadow-red-glow">
            <PhoneCall className="w-8 h-8" />
          </div>
          <p className="font-bold text-white text-base">
            මෑත ඇමතුම් කිසිවක් නැත
          </p>
          <p className="text-xs mt-1 text-gray-400 max-w-xs leading-relaxed">
            ඔබේ මිතුරන් සමඟ HD Voice හෝ Video ඇමතුම් ලබා ගන්න. ඇමතුම විසන්ධි වූ පසු චැට් එකට ස්වයංක්‍රීය සටහනක් යවනු ලැබේ.
          </p>
          <button
            type="button"
            onClick={onOpenNewCall}
            className="mt-5 px-5 py-2.5 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white rounded-full text-xs font-bold shadow-red-glow cursor-pointer transition-all"
          >
            ඇමතුමක් ආරම්භ කරන්න
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#1e1e24]">
          {callRecords.map((record) => {
            const isCallerMe = record.callerId === currentUser?.id;
            const contactName = isCallerMe ? record.receiverName : record.callerName;
            const contactAvatar = isCallerMe ? record.receiverAvatar : record.callerAvatar;

            return (
              <div
                key={record.id}
                className="flex items-center justify-between px-4 py-3.5 hover:bg-[#141418] transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <img
                    src={contactAvatar}
                    alt={contactName}
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-[#e11d48] shadow-sm bg-gray-900"
                  />

                  <div>
                    <h4
                      className={`font-semibold text-sm ${
                        record.status === 'missed'
                          ? 'text-red-400'
                          : 'text-white'
                      }`}
                    >
                      {contactName}
                    </h4>

                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                      {record.status === 'missed' ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
                      ) : isCallerMe ? (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5 text-sky-400" />
                      )}

                      <span>
                        {formatDateOrTime(record.timestamp)} {formatDuration(record.duration)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCallBack(record)}
                  className="p-2.5 rounded-full hover:bg-white/5 text-red-400 hover:text-white transition-colors cursor-pointer"
                  title="නැවත අමතන්න"
                >
                  {record.type === 'video' ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <Phone className="w-5 h-5" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={onOpenNewCall}
        title="නව ඇමතුමක්"
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-[#991b1b] to-[#e11d48] hover:from-[#e11d48] active:scale-95 text-white rounded-2xl shadow-red-glow flex items-center justify-center transition-all cursor-pointer z-20 border border-red-500/40"
      >
        <PhoneCall className="w-6 h-6" />
      </button>
    </div>
  );
};

// ==========================================
// CALL MODAL COMPONENT (VIP VOICE & VIDEO)
// ==========================================
const CallModal: React.FC = () => {
  const { activeCall, endCall, toggleMuteCall, toggleVideoCall } = useChat();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (activeCall?.record.type === 'video' && !activeCall.isVideoOff) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          localStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((e) => {
          console.warn('Camera preview not accessible:', e);
        });
    }

    return () => {
      localStream?.getTracks().forEach((track) => track.stop());
    };
  }, [activeCall?.record.type, activeCall?.isVideoOff]);

  if (!activeCall) return null;

  const isVideo = activeCall.record.type === 'video';
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#09090b]/95 backdrop-blur-md flex flex-col justify-between p-6 select-none animate-in fade-in">
      {/* Top Details */}
      <div className="flex flex-col items-center pt-8 text-center text-white">
        <div className="flex items-center gap-1.5">
          <h2 className="text-2xl font-black tracking-wide">
            {activeCall.record.receiverName}
          </h2>
          <VerifiedBadge size={18} />
        </div>
        <p className="text-xs text-red-400 mt-1 font-semibold uppercase tracking-wider">
          {activeCall.isRinging
            ? 'නාද වෙමින් පවතී (Ringing...)'
            : activeCall.isConnected
            ? `සම්බන්ධයි: ${formatTimer(activeCall.duration)}`
            : 'සම්බන්ධ වෙමින්...'}
        </p>
      </div>

      {/* Center Media / Avatar */}
      <div className="flex-1 flex items-center justify-center relative my-4">
        {isVideo && !activeCall.isVideoOff ? (
          <div className="relative w-full max-w-sm h-80 rounded-3xl overflow-hidden shadow-2xl bg-black border border-[#e11d48]/40">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Overlay */}
            <div className="absolute top-4 right-4 w-24 h-32 rounded-xl overflow-hidden border-2 border-red-500 shadow-lg bg-gray-900">
              <img
                src={activeCall.record.receiverAvatar}
                alt="Remote"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className={`w-36 h-36 rounded-full overflow-hidden shadow-2xl ring-4 ring-[#e11d48] ${
              activeCall.isRinging ? 'animate-pulse shadow-red-glow' : ''
            }`}>
              <img
                src={activeCall.record.receiverAvatar}
                alt={activeCall.record.receiverName}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-center gap-6 pb-6">
        {/* Mute Button */}
        <button
          type="button"
          onClick={toggleMuteCall}
          className={`p-4 rounded-full transition-transform active:scale-90 cursor-pointer ${
            activeCall.isMuted
              ? 'bg-red-500 text-white'
              : 'bg-[#1c1c23] border border-[#27272e] text-white hover:bg-white/10'
          }`}
          title={activeCall.isMuted ? 'Unmute' : 'Mute'}
        >
          {activeCall.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>

        {/* Video Toggle if video call */}
        {isVideo && (
          <button
            type="button"
            onClick={toggleVideoCall}
            className={`p-4 rounded-full transition-transform active:scale-90 cursor-pointer ${
              activeCall.isVideoOff
                ? 'bg-red-500 text-white'
                : 'bg-[#1c1c23] border border-[#27272e] text-white hover:bg-white/10'
            }`}
            title="කැමරාව ක්‍රියා විරහිත කරන්න"
          >
            {activeCall.isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        )}

        {/* End Call Button */}
        <button
          type="button"
          onClick={() => endCall(activeCall.isConnected ? 'completed' : 'missed')}
          className="p-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 text-white rounded-full shadow-red-glow transition-transform active:scale-90 cursor-pointer"
          title="ඇමතුම විසන්ධි කරන්න"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// ==========================================
// NEW CHAT / CONTACTS MODAL
// ==========================================
interface NewChatModalProps {
  onClose: () => void;
  onSelectUser: (user: UserProfile) => void;
  onOpenNewGroup: () => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onSelectUser, onOpenNewGroup }) => {
  const { currentUser } = useAuth();
  const { users } = useChat();
  const [search, setSearch] = useState('');
  const [customPhone, setCustomPhone] = useState('');

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);
  const filtered = search
    ? otherUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.phone.includes(search)
      )
    : otherUsers;

  const handleStartWithCustomPhone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim()) return;
    const formatted = customPhone.startsWith('+94')
      ? customPhone
      : customPhone.startsWith('0')
      ? `+94${customPhone.slice(1)}`
      : `+94${customPhone}`;

    const newUser: UserProfile = {
      id: `user_c_${Date.now()}`,
      name: formatted,
      phone: formatted,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      about: 'Zavi Chats හරහා සම්බන්ධ වී ඇත',
      isOnline: false,
      lastSeen: Date.now(),
    };
    onSelectUser(newUser);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-white">නව පණිවිඩයක් (New Chat)</h3>
            <p className="text-xs text-gray-400">{otherUsers.length} සැබෑ සබඳතා</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-[#1e1e24]">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="නම හෝ දුරකථන අංකය සොයන්න..."
              className="w-full pl-9 pr-4 py-2 bg-[#1c1c23] border border-[#27272e] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
              autoFocus
            />
          </div>
        </div>

        {/* New Group & Add by Phone */}
        <div className="p-2 border-b border-[#1e1e24] space-y-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNewGroup();
            }}
            className="w-full p-2.5 flex items-center gap-3 rounded-xl hover:bg-[#1a1a20] transition-colors cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#991b1b] to-[#e11d48] text-white flex items-center justify-center shadow-red-glow">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">නව සමූහයක් සාදන්න</p>
              <p className="text-xs text-gray-400">මිතුරන් කිහිප දෙනෙකු එකතු කරන්න</p>
            </div>
          </button>

          {/* Direct phone number entry */}
          <form onSubmit={handleStartWithCustomPhone} className="flex gap-2 p-1">
            <input
              type="tel"
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value)}
              placeholder="07X XXX XXXX දුරකථන අංකය"
              className="flex-1 px-3 py-1.5 text-xs bg-[#18181f] border border-[#27272e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
            />
            <button
              type="submit"
              disabled={!customPhone.trim()}
              className="px-3.5 py-1.5 bg-[#e11d48] hover:bg-[#be123c] text-white rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer shadow-red-glow"
            >
              චැට් කරන්න
            </button>
          </form>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e24] p-2">
          {filtered.map((user) => (
            <div
              key={user.id}
              onClick={() => onSelectUser(user)}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#1a1a20] transition-colors cursor-pointer"
            >
              <img
                src={user.avatar}
                alt={user.name}
                className="w-11 h-11 rounded-full object-cover ring-1 ring-[#e11d48] shadow-sm bg-gray-900"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="font-semibold text-sm text-white truncate">
                    {user.name}
                  </h4>
                  {user.isVerified && <VerifiedBadge size={14} />}
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {user.about}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// NEW GROUP MODAL
// ==========================================
interface NewGroupModalProps {
  onClose: () => void;
}

const NewGroupModal: React.FC<NewGroupModalProps> = ({ onClose }) => {
  const { currentUser } = useAuth();
  const { users, createGroup } = useChat();
  const [groupName, setGroupName] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedUserIds.length === 0) return;
    createGroup(groupName.trim(), '', selectedUserIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4">
        
        <div className="bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">නව සමූහයක් සාදන්න (New Group)</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="p-4 border-b border-[#1e1e24] space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              සමූහයේ නම
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="උදා: අපේ VIP සෙට් එක 🔥"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] text-sm text-white focus:outline-none focus:border-[#e11d48]"
              autoFocus
              required
            />
          </div>

          <p className="text-xs text-gray-400">
            සාමාජිකයන් තෝරන්න ({selectedUserIds.length} තෝරාගෙන ඇත):
          </p>
        </form>

        <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e24] p-2">
          {otherUsers.map((user) => {
            const isChecked = selectedUserIds.includes(user.id);
            return (
              <div
                key={user.id}
                onClick={() => toggleSelectUser(user.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                  isChecked ? 'bg-red-950/40 border border-red-800/40' : 'hover:bg-[#1a1a20]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="font-semibold text-sm text-white">
                        {user.name}
                      </h4>
                      {user.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <p className="text-xs text-gray-400">
                      {user.phone}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                    isChecked
                      ? 'bg-[#e11d48] border-[#e11d48] text-white shadow-red-glow'
                      : 'border-gray-600'
                  }`}
                >
                  {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-[#1e1e24]">
          <button
            type="button"
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || selectedUserIds.length === 0}
            className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-red-glow cursor-pointer disabled:opacity-40"
          >
            සමූහය සාදන්න
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// PROFILE MODAL COMPONENT (VIP)
// ==========================================
const ProfileModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentUser, updateProfile } = useAuth();
  const [name, setName] = useState(currentUser?.name || '');
  const [about, setAbout] = useState(currentUser?.about || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await updateProfile({ name: name.trim(), about: about.trim(), avatar });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-base text-white">මගේ VIP ගිණුම (Profile)</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={avatar}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover ring-4 ring-[#e11d48] shadow-red-glow"
              />
              <label className="absolute bottom-0 right-0 bg-[#e11d48] p-2 rounded-full text-white shadow-lg hover:bg-[#be123c] cursor-pointer">
                <Camera className="w-4 h-4" />
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
            
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-gray-300 font-mono">{currentUser?.phone}</span>
              {currentUser?.isVerified && <VerifiedBadge size={14} />}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              ඔබගේ නම (User Name)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] text-sm text-white focus:outline-none focus:border-[#e11d48]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              About (තත්ත්වය)
            </label>
            <input
              type="text"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#27272e] bg-[#1a1a20] text-sm text-white focus:outline-none focus:border-[#e11d48]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white font-bold rounded-xl shadow-red-glow transition-all cursor-pointer"
          >
            {isSaved ? 'සුරැකිණි! ✔' : 'වෙනස්කම් සුරකින්න'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// ADMIN VERIFIED BADGES MANAGER MODAL
// ==========================================
interface AdminVerifyModalProps {
  onClose: () => void;
}

const AdminVerifyModal: React.FC<AdminVerifyModalProps> = ({ onClose }) => {
  const { users, adminGrantVerified } = useChat();
  const [customIdentifier, setCustomIdentifier] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<'users' | 'grant'>('users');

  const handleGrantCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customIdentifier.trim()) return;
    adminGrantVerified(customIdentifier.trim(), true);
    setStatusMsg(`'${customIdentifier}' සඳහා Verified Badge එක ලබා දෙන ලදී! ✔`);
    setCustomIdentifier('');
    setTimeout(() => setStatusMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#20090e] via-[#2c0e16] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="font-black text-sm sm:text-base text-white">Verified Badges Manager</h3>
              <p className="text-[10px] text-amber-300 font-mono">Master Admin Panel • 0760264995</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div className="bg-emerald-950/60 border-b border-emerald-800 text-emerald-300 text-xs p-3 text-center font-bold animate-in fade-in">
            {statusMsg}
          </div>
        )}

        {/* Tab switch */}
        <div className="flex border-b border-[#27272e] bg-[#18181f]">
          <button
            type="button"
            onClick={() => setTab('users')}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
              tab === 'users' ? 'text-[#e11d48] border-b-2 border-[#e11d48] bg-[#141418]' : 'text-gray-400'
            }`}
          >
            සියලු පරිශීලකයින් ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('grant')}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
              tab === 'grant' ? 'text-[#e11d48] border-b-2 border-[#e11d48] bg-[#141418]' : 'text-gray-400'
            }`}
          >
            අංකයකින්/නමකින් Badge එක දෙන්න
          </button>
        </div>

        {tab === 'users' ? (
          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e24] p-3 space-y-1">
            {users.map((user) => {
              const isMaster = user.phone.includes('760264995') || user.name.toLowerCase() === 'mr suranga mods';
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-[#1a1a20] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h4 className="font-bold text-sm text-white truncate">{user.name}</h4>
                        {user.isVerified && <VerifiedBadge size={14} />}
                        {isMaster && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded font-bold">
                            OWNER
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">{user.phone}</p>
                    </div>
                  </div>

                  {!isMaster ? (
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = !user.isVerified;
                        adminGrantVerified(user.phone, newStatus);
                        adminGrantVerified(user.name, newStatus);
                        setStatusMsg(
                          newStatus 
                            ? `${user.name} හට Verified Badge ලබා දෙන ලදී! ✔`
                            : `${user.name} ගෙන් Verified Badge ඉවත් කරන ලදී.`
                        );
                        setTimeout(() => setStatusMsg(null), 3000);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        user.isVerified
                          ? 'bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800'
                          : 'bg-gradient-to-r from-[#be123c] to-[#e11d48] text-white shadow-red-glow'
                      }`}
                    >
                      {user.isVerified ? 'Badge එක ඉවත් කරන්න' : 'Verified කරන්න ✓'}
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Permanent</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-2xl bg-[#18181f] border border-[#27272e]">
              <p className="text-xs text-gray-300 leading-relaxed mb-3">
                ඕනෑම දුරකථන අංකයක් (උදා: <strong>0760264995</strong>) හෝ User Name එකක් මෙහි ඇතුළත් කර Enter කරන්න. එම ගිණුමට ස්වයංක්‍රීයව නිල් Verified Badge එක හිමිවේ.
              </p>
              <form onSubmit={handleGrantCustom} className="space-y-3">
                <input
                  type="text"
                  value={customIdentifier}
                  onChange={(e) => setCustomIdentifier(e.target.value)}
                  placeholder="දුරකථන අංකය හෝ User Name ඇතුළත් කරන්න..."
                  className="w-full px-3.5 py-2.5 bg-[#121216] border border-[#27272e] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-[#be123c] to-[#e11d48] hover:from-[#e11d48] text-white rounded-xl text-xs font-bold cursor-pointer shadow-red-glow"
                >
                  Verified Badge එක තහවුරු කරන්න ✓
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="p-3 bg-[#18181f] border-t border-[#27272e] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#252530] hover:bg-[#30303e] text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            වසන්න (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// REPORT USER MODAL
// ==========================================
interface ReportModalProps {
  reportedUser: UserProfile;
  onClose: () => void;
}

const ReportUserModal: React.FC<ReportModalProps> = ({ reportedUser, onClose }) => {
  const { reportUser } = useChat();
  const [reason, setReason] = useState('ස්පෑම් හෝ අනවශ්‍ය පණිවිඩ (Spam)');
  const [details, setDetails] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const REASONS = [
    'ස්පෑම් හෝ අනවශ්‍ය පණිවිඩ (Spam)',
    'අපහාසාත්මක හෝ අශිෂ්ට හැසිරීම (Harassment & Abuse)',
    'වංචනික හෝ මුදල් වංචා (Fraud / Scam)',
    'අසත්‍ය තොරතුරු හෝ අනන්‍යතා සොරකම (Impersonation)',
    'නුසුදුසු අන්තර්ගතය (Inappropriate Content)',
    'වෙනත් හේතුවක් (Other Reason)'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await reportUser(reportedUser.id, reason, details);
    setIsSubmitting(false);
    setIsSent(true);
    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#20090e] via-[#2c0e16] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-sm text-white">පරිශීලකයා වාර්තා කරන්න (Report User)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSent ? (
          <div className="p-6 text-center space-y-3">
            <div className="w-14 h-14 bg-red-950/60 border border-red-700 text-[#e11d48] rounded-full flex items-center justify-center mx-auto shadow-red-glow">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h4 className="text-base font-bold text-white">වාර්තාව සාර්ථකව යොමු විය!</h4>
            <p className="text-xs text-gray-300 leading-relaxed">
              ඔබගේ පැමිණිල්ල සහ හේතුව <strong>0760264995 (mr suranga mods)</strong> වෙත ක්ෂණිකව යවන ලදී. ඉක්මනින් පියවර ගනු ඇත.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Target user info */}
            <div className="bg-[#18181f] p-3 rounded-2xl border border-[#27272e] flex items-center gap-3">
              <img
                src={reportedUser.avatar}
                alt={reportedUser.name}
                className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="font-bold text-white text-xs sm:text-sm">{reportedUser.name}</h4>
                  {reportedUser.isVerified && <VerifiedBadge size={13} />}
                </div>
                <p className="text-[11px] text-gray-400 font-mono">{reportedUser.phone}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                වාර්තා කිරීමට හේතුව තෝරන්න:
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                      reason === r
                        ? 'bg-red-950/40 border-[#e11d48] text-white font-semibold'
                        : 'border-[#27272e] text-gray-300 hover:bg-[#1a1a20]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-[#e11d48]"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                අමතර විස්තර (විකල්ප):
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="සිදුවූ ගැටලුව පිළිබඳව කෙටි විස්තරයක් ලියන්න..."
                rows={2}
                className="w-full bg-[#18181f] border border-[#27272e] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#e11d48]"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/50 text-[11px] text-red-300 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>මෙම වාර්තාව 0760264995 mr suranga mods හට සෘජුවම ලැබෙනු ඇත.</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-[#202028] hover:bg-[#2a2a35] text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                අවලංගු කරන්න
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-[#e11d48] hover:from-red-500 text-white rounded-xl text-xs font-bold shadow-red-glow cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'යවමින් පවතී...' : 'වාර්තා කරන්න (Report)'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ==========================================
// FORWARD MESSAGE MODAL
// ==========================================
interface ForwardModalProps {
  message: Message;
  onClose: () => void;
}

const ForwardModal: React.FC<ForwardModalProps> = ({ message, onClose }) => {
  const { currentUser } = useAuth();
  const { users, forwardMessage } = useChat();
  const [forwardedTo, setForwardedTo] = useState<string | null>(null);

  const targets = users.filter((u) => u.id !== currentUser?.id);

  const handleForward = async (targetId: string, name: string) => {
    await forwardMessage(message, targetId);
    setForwardedTo(name);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        <div className="bg-gradient-to-r from-[#180a0e] via-[#1f1015] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-red-400" />
            <h3 className="font-bold text-sm text-white">පණිවිඩය ඉදිරියට යවන්න (Forward)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="p-3 bg-[#18181f] border-b border-[#27272e] text-xs text-gray-300 italic truncate">
          {message.type === 'text' && message.text}
          {message.type === 'image' && '📷 ඡායාරූපයක්'}
          {message.type === 'voice' && '🎤 හඬ පණිවිඩයක්'}
        </div>

        {forwardedTo ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-12 h-12 bg-red-950/60 border border-red-700 text-[#e11d48] rounded-full flex items-center justify-center mx-auto shadow-red-glow">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className="font-bold text-white text-sm">
              {forwardedTo} වෙත පණිවිඩය යවන ලදී!
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-[#1e1e24] p-2">
            {targets.map((user) => (
              <div
                key={user.id}
                onClick={() => handleForward(user.id, user.name)}
                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#1a1a20] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover ring-1 ring-[#e11d48]"
                  />
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="font-semibold text-sm text-white">{user.name}</h4>
                      {user.isVerified && <VerifiedBadge size={13} />}
                    </div>
                    <p className="text-xs text-gray-400 font-mono">{user.phone}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 bg-[#e11d48] text-white rounded-xl text-xs font-bold shadow-red-glow"
                >
                  Forward
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// ABOUT ZAVI CHATS MODAL (VIP RED & BLACK)
// ==========================================
interface AboutModalProps {
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex justify-center items-center p-4 select-none">
      <div className="bg-[#121216] border border-[#27272e] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#20090e] via-[#2c0e16] to-[#121216] border-b border-[#27272e] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-sm text-white">Zavi Chats ගැන (About)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#991b1b] to-[#e11d48] flex items-center justify-center text-white mx-auto shadow-red-glow">
            <Sparkles className="w-8 h-8" />
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-xl font-black text-white tracking-wider">
                ZAVI CHATS
              </h2>
              <span className="text-[10px] px-2 py-0.5 bg-[#e11d48]/30 text-[#e11d48] border border-[#e11d48]/50 rounded font-black tracking-widest">
                VIP 2.0
              </span>
            </div>
            <p className="text-xs text-red-400 font-semibold mt-1">
              ශ්‍රී ලාංකිකයන් සඳහාම නිර්මාණය කරන ලද Realtime Messaging ජාලය
            </p>
          </div>

          {/* Core requirement statement */}
          <div className="p-4 rounded-2xl bg-[#1c1c23] border border-[#e11d48]/40 shadow-inner">
            <p className="text-sm font-bold text-white leading-relaxed">
              &quot;Zavi Chats නිර්මාණය කරන ලද්දේ <span className="text-red-400 font-black">Zanta Mods</span> විසිනි.&quot;
            </p>
            <p className="text-xs text-gray-400 mt-1">
              All Rights Reserved • Developed by Zanta Mods
            </p>
          </div>

          {/* Feature list */}
          <div className="text-left bg-[#18181f] p-4 rounded-2xl border border-[#27272e] space-y-2 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              <span>WhatsApp Data Package වලින් ක්‍රියාත්මක වන පරිදි Optimized කර ඇත.</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              <span>Google Authenticator TOTP ආරක්ෂාව (No SMS OTP).</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              <span>Hiru News Live සජීවී පුවත් සංග්‍රහය.</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              <span>Zavi AI ස්මාර්ට් සහායකයා (Powered by Zanta Mods).</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              <span>Reels & Social Feed (Post, Video, Likes & Comments).</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-red-400 shrink-0" />
              <span>HD Voice & Video ඇමතුම් සහ Realtime Call Logs.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-[#be123c] to-[#e11d48] text-white rounded-xl text-xs font-bold shadow-red-glow cursor-pointer"
          >
            තේරුම් ගත්තා (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN APP CONTENT
// ==========================================
const MainAppContent: React.FC = () => {
  const { currentUser, isLoading, isAdmin } = useAuth();
  const { 
    users, 
    groups, 
    messages, 
    statuses, 
    callRecords, 
    activeChatId, 
    activeChat, 
    activeChatUser, 
    setActiveChatId 
  } = useChat();

  const [activeTab, setActiveTab] = useState<MainTab>('chats');
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdminVerifyModal, setShowAdminVerifyModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [reportTargetUser, setReportTargetUser] = useState<UserProfile | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-3 select-none">
        <div className="w-12 h-12 border-4 border-[#e11d48]/20 border-t-[#e11d48] rounded-full animate-spin shadow-red-glow" />
        <p className="text-white font-bold text-sm tracking-wider">ZAVI CHATS</p>
      </div>
    );
  }

  // If not logged in, show Sri Lanka Phone & Google Authenticator VIP screen
  if (!currentUser) {
    return <AuthScreen />;
  }

  // Count unread messages
  const totalUnread = messages.filter(
    (m) => m.receiverId === currentUser.id && m.status !== 'seen'
  ).length;

  const missedCalls = callRecords.filter(
    (c) => c.status === 'missed' && c.receiverId === currentUser.id
  ).length;

  const hasNewStatus = statuses.some((s) => s.userId !== currentUser.id);

  return (
    <div className="flex justify-center items-center min-h-screen bg-black p-0 sm:p-4">
      {/* Mobile-first VIP container with red glow border */}
      <div className="w-full max-w-lg h-screen sm:h-[94vh] bg-[#09090b] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-[#27272e] shadow-[0_0_50px_rgba(225,29,72,0.15)]">
        
        {/* If Active Chat Room is open */}
        {activeChatId && activeChat ? (
          <ChatRoom
            chat={activeChat}
            chatUser={activeChatUser}
            onBack={() => setActiveChatId(null)}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenReportModal={(user) => setReportTargetUser(user)}
            onForwardMessageModal={(msg) => setForwardingMessage(msg)}
          />
        ) : (
          /* Main Tabbed View */
          <div className="flex flex-col h-full">
            <Header
              onOpenNewGroup={() => setShowNewGroupModal(true)}
              onOpenProfile={() => setShowProfileModal(true)}
              onOpenAbout={() => setShowAboutModal(true)}
              onOpenAdminVerify={() => setShowAdminVerifyModal(true)}
              onSearchToggle={() => {
                setIsSearching((p) => !p);
                if (isSearching) setSearchQuery('');
              }}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
            />

            <NavigationTabs
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                setIsSearching(false);
                setSearchQuery('');
              }}
              unreadCount={totalUnread}
              hasNewStatus={hasNewStatus}
              missedCallsCount={missedCalls}
            />

            <main className="flex-1 overflow-hidden relative">
              {activeTab === 'chats' && (
                <ChatList
                  users={users}
                  groups={groups}
                  messages={messages}
                  activeChatId={activeChatId}
                  onSelectChat={(id) => setActiveChatId(id)}
                  onOpenNewChatModal={() => setShowNewChatModal(true)}
                  searchQuery={searchQuery}
                />
              )}

              {activeTab === 'news' && <HiruNewsView />}

              {activeTab === 'feed' && <SocialFeedView />}

              {activeTab === 'status' && <StatusView />}

              {activeTab === 'calls' && (
                <CallsView onOpenNewCall={() => setShowNewChatModal(true)} />
              )}
            </main>
          </div>
        )}

        {/* Global Active Call Overlay (Voice / Video) */}
        <CallModal />

        {/* Modals */}
        {showNewChatModal && (
          <NewChatModal
            onClose={() => setShowNewChatModal(false)}
            onSelectUser={(u) => {
              setShowNewChatModal(false);
              setActiveChatId(u.id);
            }}
            onOpenNewGroup={() => setShowNewGroupModal(true)}
          />
        )}

        {showNewGroupModal && (
          <NewGroupModal onClose={() => setShowNewGroupModal(false)} />
        )}

        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}

        {showAdminVerifyModal && (
          <AdminVerifyModal onClose={() => setShowAdminVerifyModal(false)} />
        )}

        {showAboutModal && (
          <AboutModal onClose={() => setShowAboutModal(false)} />
        )}

        {reportTargetUser && (
          <ReportUserModal
            reportedUser={reportTargetUser}
            onClose={() => setReportTargetUser(null)}
          />
        )}

        {forwardingMessage && (
          <ForwardModal
            message={forwardingMessage}
            onClose={() => setForwardingMessage(null)}
          />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <MainAppContent />
      </ChatProvider>
    </AuthProvider>
  );
}
