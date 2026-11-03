import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  UserProfile, 
  Message, 
  StatusItem, 
  CallRecord, 
  Chat, 
  SocialPost, 
  NewsItem, 
  UserReport 
} from './types.ts';
import {
  subscribeToUsers,
  subscribeToMessages,
  subscribeToStatuses,
  subscribeToCalls,
  subscribeToPosts,
  sendMessageToDatabase,
  updateMessageInDatabase,
  deleteMessageFromDatabase,
  reactToMessageInDatabase,
  addStatusToDatabase,
  reactToStatusInDatabase,
  saveCallRecord,
  saveUserToDatabase,
  savePostToDatabase,
  reactToPostInDatabase,
  addCommentToPostInDatabase,
  submitUserReport,
  fetchLiveNews,
  askZaviAi,
  grantVerifiedBadge,
  isUserVerified,
  seedInitialData,
  MASTER_ADMIN_USER,
  ZAVI_AI_BOT_USER
} from './firebase.ts';
import { playSentSound, playReceivedSound, startRingtone, stopRingtone } from './audio.ts';

// ==========================================
// AUTH CONTEXT
// ==========================================
interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  loginUser: (user: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
  toggleBlockUser: (targetUserId: string) => Promise<void>;
  isAdmin: boolean;
}

const CURRENT_USER_STORAGE_KEY = 'zavi_vip_current_user_profile';
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    seedInitialData();
    const stored = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: UserProfile = JSON.parse(stored);
        parsed.isOnline = true;
        parsed.lastSeen = Date.now();
        parsed.isVerified = isUserVerified(parsed.phone, parsed.name);
        setCurrentUser(parsed);
        saveUserToDatabase(parsed);
      } catch (e) {
        console.error('Failed to parse current user:', e);
      }
    }
    setIsLoading(false);

    const handleUnload = () => {
      if (currentUser) {
        const offline = { ...currentUser, isOnline: false, lastSeen: Date.now() };
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(offline));
        saveUserToDatabase(offline);
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  const loginUser = async (user: UserProfile) => {
    const verified = isUserVerified(user.phone, user.name);
    const updated: UserProfile = {
      ...user,
      isOnline: true,
      lastSeen: Date.now(),
      isVerified: verified,
      role: (user.phone.includes('760264995') || user.name.toLowerCase() === 'mr suranga mods') ? 'admin' : user.role || 'user',
    };
    setCurrentUser(updated);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updated));
    await saveUserToDatabase(updated);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = {
      ...currentUser,
      ...updates,
      lastSeen: Date.now(),
      isVerified: isUserVerified(updates.phone || currentUser.phone, updates.name || currentUser.name),
    };
    setCurrentUser(updated);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(updated));
    await saveUserToDatabase(updated);
  };

  const logout = () => {
    if (currentUser) {
      saveUserToDatabase({ ...currentUser, isOnline: false, lastSeen: Date.now() });
    }
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
  };

  const toggleBlockUser = async (targetUserId: string) => {
    if (!currentUser) return;
    const blocked = currentUser.blockedUsers || [];
    const isAlreadyBlocked = blocked.includes(targetUserId);
    const updatedBlocked = isAlreadyBlocked
      ? blocked.filter(id => id !== targetUserId)
      : [...blocked, targetUserId];

    await updateProfile({ blockedUsers: updatedBlocked });
  };

  const isAdmin = currentUser 
    ? (currentUser.phone.includes('760264995') || currentUser.name.toLowerCase() === 'mr suranga mods' || currentUser.role === 'admin')
    : false;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        loginUser,
        updateProfile,
        logout,
        toggleBlockUser,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ==========================================
// CHAT & APP CONTEXT
// ==========================================
interface ActiveCallState {
  record: CallRecord;
  isRinging: boolean;
  isConnected: boolean;
  duration: number;
  isMuted: boolean;
  isVideoOff: boolean;
}

interface ChatContextType {
  users: UserProfile[];
  messages: Message[];
  statuses: StatusItem[];
  posts: SocialPost[];
  news: NewsItem[];
  isLoadingNews: boolean;
  callRecords: CallRecord[];
  activeChatId: string | null;
  activeChat: Chat | null;
  activeChatUser: UserProfile | null;
  typingUserIds: string[];
  activeCall: ActiveCallState | null;
  setActiveChatId: (id: string | null) => void;
  sendTextMessage: (text: string) => Promise<void>;
  sendImageMessage: (imageUrl: string) => Promise<void>;
  sendVoiceMessage: (audioUrl: string, duration: number) => Promise<void>;
  pinMessage: (msgId: string, pinned: boolean) => Promise<void>;
  deleteMessage: (msgId: string) => Promise<void>;
  reactToMessage: (msgId: string, emoji: string) => Promise<void>;
  forwardMessage: (msg: Message, targetId: string) => Promise<void>;
  postStatus: (type: 'text' | 'image', content: string, caption?: string, bgColor?: string, textColor?: string) => Promise<void>;
  reactToStatus: (statusId: string, emoji: string) => Promise<void>;
  createSocialPost: (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => Promise<void>;
  reactToSocialPost: (postId: string, emoji: string) => Promise<void>;
  addCommentToPost: (postId: string, text: string) => Promise<void>;
  reportUser: (reportedUserId: string, reason: string, details?: string) => Promise<void>;
  initiateCall: (targetUser: UserProfile, type: 'voice' | 'video') => void;
  answerCall: () => void;
  endCall: (status?: 'completed' | 'missed' | 'rejected') => void;
  toggleMuteCall: () => void;
  toggleVideoCall: () => void;
  createGroup: (name: string, avatar: string, participantIds: string[]) => string;
  groups: Chat[];
  clearChatHistory: (targetId: string) => void;
  adminGrantVerified: (identifier: string, grant: boolean) => void;
  refreshNews: () => Promise<void>;
}

const LOCAL_GROUPS_KEY = 'zavi_vip_groups';
const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [groups, setGroups] = useState<Chat[]>([]);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  useEffect(() => {
    // Load groups
    const savedGroups = localStorage.getItem(LOCAL_GROUPS_KEY);
    if (savedGroups) {
      try {
        setGroups(JSON.parse(savedGroups));
      } catch {
        // ignore
      }
    }

    // Subscriptions
    const unsubUsers = subscribeToUsers((u) => setUsers(u));
    const unsubMsgs = subscribeToMessages((msgs) => setMessages(msgs));
    const unsubStatuses = subscribeToStatuses((s) => setStatuses(s));
    const unsubCalls = subscribeToCalls((c) => setCallRecords(c));
    const unsubPosts = subscribeToPosts((p) => setPosts(p));

    // Load Hiru News
    refreshNews();

    return () => {
      unsubUsers();
      unsubMsgs();
      unsubStatuses();
      unsubCalls();
      unsubPosts();
    };
  }, []);

  const refreshNews = async () => {
    setIsLoadingNews(true);
    const items = await fetchLiveNews();
    setNews(items);
    setIsLoadingNews(false);
  };

  // Sound on incoming messages
  useEffect(() => {
    if (!messages.length || !currentUser) return;
    const lastMsg = messages[messages.length - 1];
    const isRecent = Date.now() - lastMsg.timestamp < 3000;
    if (isRecent && lastMsg.receiverId === currentUser.id && lastMsg.senderId !== currentUser.id) {
      playReceivedSound();
      if (activeChatId === lastMsg.senderId) {
        updateMessageInDatabase(lastMsg.id, { status: 'seen' });
      } else {
        updateMessageInDatabase(lastMsg.id, { status: 'delivered' });
      }
    }
  }, [messages, currentUser, activeChatId]);

  // Mark messages seen
  useEffect(() => {
    if (!activeChatId || !currentUser) return;
    messages.forEach((msg) => {
      if (msg.senderId === activeChatId && msg.receiverId === currentUser.id && msg.status !== 'seen') {
        updateMessageInDatabase(msg.id, { status: 'seen' });
      }
    });
  }, [activeChatId, messages, currentUser]);

  // Call timer and automatic simulated ring/answer
  useEffect(() => {
    if (!activeCall) {
      stopRingtone();
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    let ringTimeout: ReturnType<typeof setTimeout> | null = null;

    if (activeCall.isRinging) {
      startRingtone();
      ringTimeout = setTimeout(() => {
        stopRingtone();
        setActiveCall((prev) => (prev ? { ...prev, isRinging: false, isConnected: true } : null));
      }, 3500);
    } else if (activeCall.isConnected) {
      stopRingtone();
      interval = setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
    }

    return () => {
      stopRingtone();
      if (interval) clearInterval(interval);
      if (ringTimeout) clearTimeout(ringTimeout);
    };
  }, [activeCall?.isRinging, activeCall?.isConnected]);

  // Active chat metadata
  const activeChatGroup = groups.find((g) => g.id === activeChatId);
  const activeChatUser = users.find((u) => u.id === activeChatId) || null;

  const activeChat: Chat | null = activeChatGroup
    ? activeChatGroup
    : activeChatUser
    ? {
        id: activeChatUser.id,
        isGroup: false,
        name: activeChatUser.name,
        avatar: activeChatUser.avatar,
        isVerified: activeChatUser.isVerified,
        isAiBot: activeChatUser.id === ZAVI_AI_BOT_USER.id,
        participantIds: [activeChatUser.id, currentUser?.id || ''],
      }
    : null;

  const sendTextMessage = async (text: string) => {
    if (!currentUser || !activeChatId || !text.trim()) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: activeChatId,
      text: text.trim(),
      type: 'text',
      timestamp: Date.now(),
      status: 'sent',
    };

    playSentSound();
    await sendMessageToDatabase(newMsg);

    // If chatting with ZAVI AI BOT -> Fetch answer from API!
    if (activeChatId === ZAVI_AI_BOT_USER.id) {
      setTypingUserIds((prev) => [...prev, ZAVI_AI_BOT_USER.id]);

      try {
        const aiAnswer = await askZaviAi(text.trim());
        setTypingUserIds((prev) => prev.filter((id) => id !== ZAVI_AI_BOT_USER.id));

        const botReplyMsg: Message = {
          id: `msg_ai_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: ZAVI_AI_BOT_USER.id,
          senderName: 'Zavi AI',
          receiverId: currentUser.id,
          text: aiAnswer,
          type: 'text',
          timestamp: Date.now(),
          status: 'sent',
        };

        playReceivedSound();
        await sendMessageToDatabase(botReplyMsg);
      } catch (err) {
        setTypingUserIds((prev) => prev.filter((id) => id !== ZAVI_AI_BOT_USER.id));
      }
    }
  };

  const sendImageMessage = async (imageUrl: string) => {
    if (!currentUser || !activeChatId) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: activeChatId,
      type: 'image',
      mediaUrl: imageUrl,
      timestamp: Date.now(),
      status: 'sent',
    };

    playSentSound();
    await sendMessageToDatabase(newMsg);
  };

  const sendVoiceMessage = async (audioUrl: string, duration: number) => {
    if (!currentUser || !activeChatId) return;

    const newMsg: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: activeChatId,
      type: 'voice',
      mediaUrl: audioUrl,
      duration,
      timestamp: Date.now(),
      status: 'sent',
    };

    playSentSound();
    await sendMessageToDatabase(newMsg);
  };

  const pinMessage = async (msgId: string, pinned: boolean) => {
    await updateMessageInDatabase(msgId, { pinned });
  };

  const deleteMessage = async (msgId: string) => {
    await deleteMessageFromDatabase(msgId);
  };

  const reactToMessage = async (msgId: string, emoji: string) => {
    if (!currentUser) return;
    await reactToMessageInDatabase(msgId, emoji, currentUser.id);
  };

  const forwardMessage = async (msg: Message, targetId: string) => {
    if (!currentUser) return;
    const forwardMsg: Message = {
      ...msg,
      id: `msg_fwd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: targetId,
      timestamp: Date.now(),
      isForwarded: true,
      status: 'sent',
    };
    playSentSound();
    await sendMessageToDatabase(forwardMsg);
  };

  // POST STATUS WITH INSTANT LOCAL & RTDB BROADCAST
  const postStatus = async (
    type: 'text' | 'image',
    content: string,
    caption?: string,
    bgColor = '#09090b',
    textColor = '#ffffff'
  ) => {
    if (!currentUser) return;
    const newStatus: StatusItem = {
      id: `status_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
      type,
      content,
      caption: caption || '',
      backgroundColor: bgColor,
      textColor: textColor,
      timestamp: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      viewedBy: [],
      reactions: {},
    };

    await addStatusToDatabase(newStatus);
  };

  const reactToStatus = async (statusId: string, emoji: string) => {
    if (!currentUser) return;
    await reactToStatusInDatabase(statusId, emoji, currentUser.id);

    // Also send reaction as a chat message to the status creator!
    const targetStatus = statuses.find(s => s.id === statusId);
    if (targetStatus && targetStatus.userId !== currentUser.id) {
      const reactionMsg: Message = {
        id: `msg_react_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: targetStatus.userId,
        text: `ස්ටේටස් එකට රිඇක්ට් කරන ලදී: ${emoji}`,
        type: 'text',
        timestamp: Date.now(),
        status: 'sent',
      };
      await sendMessageToDatabase(reactionMsg);
    }
  };

  // SOCIAL FEED POSTS
  const createSocialPost = async (text: string, mediaUrl?: string, mediaType?: 'image' | 'video') => {
    if (!currentUser) return;
    const newPost: SocialPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
      text: text.trim(),
      mediaUrl,
      mediaType,
      timestamp: Date.now(),
      likes: [],
      reactions: {},
      comments: [],
    };
    await savePostToDatabase(newPost);
  };

  const reactToSocialPost = async (postId: string, emoji: string) => {
    if (!currentUser) return;
    await reactToPostInDatabase(postId, emoji, currentUser.id);
  };

  const addCommentToPost = async (postId: string, text: string) => {
    if (!currentUser || !text.trim()) return;
    const comment = {
      id: `comm_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      isVerified: currentUser.isVerified,
      text: text.trim(),
      timestamp: Date.now(),
    };
    await addCommentToPostInDatabase(postId, comment);
  };

  // REPORT USER (SENDS TO 0760264995 / mr suranga mods)
  const reportUser = async (reportedUserId: string, reason: string, details?: string) => {
    if (!currentUser) return;
    const targetUser = users.find(u => u.id === reportedUserId);
    if (!targetUser) return;

    const report: UserReport = {
      id: `report_${Date.now()}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reporterPhone: currentUser.phone,
      reportedUserId: targetUser.id,
      reportedUserName: targetUser.name,
      reportedUserPhone: targetUser.phone,
      reason,
      details,
      timestamp: Date.now(),
      status: 'pending',
    };

    await submitUserReport(report);
  };

  // CALLS WITH AUTOMATIC CALL MESSAGE LOGGING TO CHAT
  const initiateCall = (targetUser: UserProfile, type: 'voice' | 'video') => {
    if (!currentUser) return;

    const callRecord: CallRecord = {
      id: `call_${Date.now()}`,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerAvatar: currentUser.avatar,
      receiverId: targetUser.id,
      receiverName: targetUser.name,
      receiverAvatar: targetUser.avatar,
      type,
      direction: 'outgoing',
      status: 'completed',
      timestamp: Date.now(),
      duration: 0,
    };

    setActiveCall({
      record: callRecord,
      isRinging: true,
      isConnected: false,
      duration: 0,
      isMuted: false,
      isVideoOff: false,
    });
  };

  const answerCall = () => {
    if (!activeCall) return;
    stopRingtone();
    setActiveCall((prev) => (prev ? { ...prev, isRinging: false, isConnected: true } : null));
  };

  const endCall = (status: 'completed' | 'missed' | 'rejected' = 'completed') => {
    if (!activeCall) return;
    stopRingtone();

    const finalStatus = activeCall.duration > 0 ? 'completed' : status;
    const finalRecord: CallRecord = {
      ...activeCall.record,
      duration: activeCall.duration,
      status: finalStatus,
    };

    saveCallRecord(finalRecord);

    // Automatically send Call Message / Missed Call alert to the recipient in chat!
    const callTypeSinhala = finalRecord.type === 'video' ? 'Video ඇමතුමක්' : 'Voice ඇමතුමක්';
    const statusText = finalStatus === 'missed'
      ? `🚫 මඟහැරුණු ${callTypeSinhala} (Missed Call)`
      : finalStatus === 'rejected'
      ? `⛔ ප්‍රතික්ෂේප වූ ${callTypeSinhala}`
      : `📞 ${callTypeSinhala} අවසන් විය (${Math.floor(activeCall.duration / 60)}m ${activeCall.duration % 60}s)`;

    const callMsg: Message = {
      id: `msg_call_${Date.now()}`,
      senderId: finalRecord.callerId,
      senderName: finalRecord.callerName,
      receiverId: finalRecord.receiverId,
      text: statusText,
      type: 'call_log',
      timestamp: Date.now(),
      status: 'sent',
      callInfo: {
        type: finalRecord.type,
        duration: activeCall.duration,
        status: finalStatus,
      },
    };

    sendMessageToDatabase(callMsg);
    setActiveCall(null);
  };

  const toggleMuteCall = () => {
    setActiveCall((prev) => (prev ? { ...prev, isMuted: !prev.isMuted } : null));
  };

  const toggleVideoCall = () => {
    setActiveCall((prev) => (prev ? { ...prev, isVideoOff: !prev.isVideoOff } : null));
  };

  const createGroup = (name: string, avatar: string, participantIds: string[]): string => {
    const groupId = `group_${Date.now()}`;
    const newGroup: Chat = {
      id: groupId,
      isGroup: true,
      name,
      avatar: avatar || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
      participantIds: [...participantIds, currentUser?.id || ''],
    };

    const updated = [newGroup, ...groups];
    setGroups(updated);
    localStorage.setItem(LOCAL_GROUPS_KEY, JSON.stringify(updated));

    if (currentUser) {
      const welcomeMsg: Message = {
        id: `msg_grp_welcome_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.name,
        receiverId: groupId,
        text: `"${name}" සමූහය සාදන ලදී 🎉`,
        type: 'text',
        timestamp: Date.now(),
        status: 'sent',
      };
      sendMessageToDatabase(welcomeMsg);
    }

    setActiveChatId(groupId);
    return groupId;
  };

  const clearChatHistory = (targetId: string) => {
    if (!currentUser) return;
    const remaining = messages.filter(
      (m) =>
        !(
          (m.senderId === currentUser.id && m.receiverId === targetId) ||
          (m.senderId === targetId && m.receiverId === currentUser.id) ||
          m.receiverId === targetId
        )
    );
    setMessages(remaining);
    localStorage.setItem('zavi_real_messages_list', JSON.stringify(remaining));
  };

  const adminGrantVerified = (identifier: string, grant: boolean) => {
    grantVerifiedBadge(identifier, grant);
    // Refresh local list
    const updatedUsers = users.map(u => {
      if (u.phone.includes(identifier) || u.name.toLowerCase() === identifier.toLowerCase() || u.id === identifier) {
        return { ...u, isVerified: grant };
      }
      return u;
    });
    setUsers(updatedUsers);
  };

  return (
    <ChatContext.Provider
      value={{
        users,
        messages,
        statuses,
        posts,
        news,
        isLoadingNews,
        callRecords,
        activeChatId,
        activeChat,
        activeChatUser,
        typingUserIds,
        activeCall,
        setActiveChatId,
        sendTextMessage,
        sendImageMessage,
        sendVoiceMessage,
        pinMessage,
        deleteMessage,
        reactToMessage,
        forwardMessage,
        postStatus,
        reactToStatus,
        createSocialPost,
        reactToSocialPost,
        addCommentToPost,
        reportUser,
        initiateCall,
        answerCall,
        endCall,
        toggleMuteCall,
        toggleVideoCall,
        createGroup,
        groups,
        clearChatHistory,
        adminGrantVerified,
        refreshNews,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
