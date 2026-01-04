"use client"

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import ChatArea from '../components/layout/ChatArea';
import InputBox from '../components/layout/InputBox';
import Toast from '../components/ui/Toast';
import Canvas from '../components/tools/Canvas';
import Study from '../components/tools/Study';
import ImageGen from '../components/tools/ImageGen';
import VideoGen from '../components/tools/VideoGen';
import WebSearch from '../components/tools/WebSearch';
import { api, Chat, ChatMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ToolId } from '../lib/tools';

export default function Page() {
  const { idToken } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolId>('chat');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; variant?: any; message: string }>({
    open: false,
    message: '',
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [idToken]);

  // Load messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      loadMessages(activeChat);
      setSidebarOpen(false);
    }
  }, [activeChat]);

  async function loadChats() {
    const health = await api.checkHealth();
    if (!health) {
      // Backend unavailable, use local demo data
      setChats([
        { id: 'demo-1', title: 'Welcome Chat' },
        { id: 'demo-2', title: 'Getting Started' },
      ]);
      return;
    }

    const fetchedChats = await api.getChats(idToken || undefined);
    setChats(fetchedChats);
    if (fetchedChats.length > 0 && !activeChat) {
      setActiveChat(fetchedChats[0].id);
    }
  }

  async function loadMessages(chatId: string) {
    if (chatId.startsWith('demo-')) {
      // Demo chat
      setMessages([
        {
          id: '1',
          role: 'user',
          content: 'Hello! How can you help me today?',
        },
        {
          id: '2',
          role: 'assistant',
          content: 'Hello! I\'m Gemini, your AI assistant. I can help you with:\n\n- Answering questions\n- Writing and editing\n- Code assistance\n- Creative brainstorming\n- And much more!\n\nWhat would you like to explore?',
        },
      ]);
      return;
    }

    const fetchedMessages = await api.getMessages(chatId, idToken || undefined);
    setMessages(fetchedMessages);
  }

  async function handleNewChat() {
    const health = await api.checkHealth();
    if (!health) {
      showToast('Backend unavailable. Creating demo chat.', 'warning');
      const newId = `demo-${Date.now()}`;
      setChats([{ id: newId, title: 'New Chat' }, ...chats]);
      setActiveChat(newId);
      setMessages([]);
      return;
    }

    const result = await api.createChat('New Chat', idToken || undefined);
    if (result) {
      await loadChats();
      setActiveChat(result.id);
    } else {
      showToast('Failed to create chat', 'error');
    }
  }

  async function handleSendMessage(content: string) {
    const health = await api.checkHealth();
    
    if (!health || !health.checks.gemini) {
      showToast('Gemini API not configured. Showing preview response.', 'info');
      
      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
      };
      setMessages([...messages, userMsg]);

      // Simulate streaming
      setIsStreaming(true);
      setTimeout(() => {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `(Preview Mode) This is a simulated response. To enable real AI responses, configure your GEMINI_API_KEY in the backend environment.\n\nYour question was: "${content}"\n\nOnce configured, I'll provide intelligent, contextual responses to your queries!`,
        };
        setMessages([...messages, userMsg, assistantMsg]);
        setIsStreaming(false);
      }, 1500);
      return;
    }

    // Real streaming
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
    };
    
    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
    };

    setMessages([...messages, userMsg, assistantMsg]);
    setIsStreaming(true);

    abortControllerRef.current = new AbortController();

    try {
      const stream = api.streamChat(
        activeChat,
        content,
        'gemini-2.0-flash',
        idToken || undefined,
        abortControllerRef.current.signal
      );

      for await (const event of stream) {
        if (event.type === 'meta' && event.data.chat_id) {
          if (!activeChat) {
            setActiveChat(event.data.chat_id);
            await loadChats();
          }
        } else if (event.type === 'token') {
          assistantMsg.content += event.data.text || '';
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMsg.id ? { ...msg, content: assistantMsg.content } : msg))
          );
        } else if (event.type === 'done') {
          setIsStreaming(false);
        } else if (event.type === 'error') {
          showToast(event.data.message || 'Error generating response', 'error');
          setIsStreaming(false);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        showToast(error.message || 'Failed to send message', 'error');
      }
      setIsStreaming(false);
    }
  }

  function handleStop() {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }

  function showToast(message: string, variant: any = 'info') {
    setToast({ open: true, message, variant });
  }

  function handlePromptClick(prompt: string) {
    handleSendMessage(prompt);
  }

  return (
    <div className="h-screen flex overflow-hidden bg-bg-primary">
      <Toast
        open={toast.open}
        onClose={() => setToast({ ...toast, open: false })}
        message={toast.message}
        variant={toast.variant}
      />

      <Sidebar
        chats={chats}
        activeId={activeChat}
        onSelectChat={(id) => {
          setActiveChat(id);
          setActiveTool('chat');
        }}
        onNewChat={() => {
          handleNewChat();
          setActiveTool('chat');
        }}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeTool={activeTool}
        onToolChange={setActiveTool}
      />

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
        className="flex-1 flex flex-col overflow-hidden relative"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              x: [0, 120, -30, 0],
              y: [0, -60, 40, 0],
              scale: [1, 1.25, 0.95, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 28,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
            }}
            className="absolute top-0 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-accent-primary/12 to-accent-primary/5 blur-[140px]"
          />
          <motion.div
            animate={{
              x: [0, -90, 60, 0],
              y: [0, 80, -40, 0],
              scale: [1, 1.15, 1.05, 1],
              rotate: [0, -8, 8, 0],
            }}
            transition={{
              duration: 35,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
              delay: 3,
            }}
            className="absolute top-1/4 -left-48 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-accent-secondary/10 to-purple-500/5 blur-[160px]"
          />
          <motion.div
            animate={{
              x: [0, 50, -70, 0],
              y: [0, -40, 60, 0],
              scale: [1, 1.2, 0.9, 1],
            }}
            transition={{
              duration: 32,
              repeat: Infinity,
              ease: [0.45, 0, 0.55, 1],
              delay: 7,
            }}
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-gradient-to-tl from-indigo-500/8 to-transparent blur-[130px]"
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1 overflow-hidden flex flex-col"
          >
            {activeTool === 'chat' && (
              <>
                <ChatArea
                  messages={messages}
                  isStreaming={isStreaming}
                  isEmpty={messages.length === 0}
                  onPromptClick={handlePromptClick}
                />
                <InputBox
                  onSend={handleSendMessage}
                  isStreaming={isStreaming}
                  onStop={handleStop}
                />
              </>
            )}
            {activeTool === 'canvas' && <Canvas />}
            {activeTool === 'study' && <Study />}
            {activeTool === 'image' && <ImageGen />}
            {activeTool === 'video' && <VideoGen />}
            {activeTool === 'search' && <WebSearch />}
          </motion.div>
        </AnimatePresence>
      </motion.main>
    </div>
  );
}
