"use client"

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, MessageSquare, Menu, X, FileText, BookOpen, Image, Video, Globe, Settings, User, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import { Chat } from '@/lib/api';
import { ToolId } from '@/lib/tools';

interface SidebarProps {
  chats: Chat[];
  activeId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
  activeTool: ToolId;
  onToolChange: (tool: ToolId) => void;
}

const toolIcons: Record<ToolId, any> = {
  chat: MessageSquare,
  canvas: FileText,
  study: BookOpen,
  image: Image,
  video: Video,
  search: Globe,
};

const tools: { id: ToolId; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'canvas', label: 'Canvas' },
  { id: 'study', label: 'Study & Learn' },
  { id: 'image', label: 'Image Generation' },
  { id: 'video', label: 'Video Generation' },
  { id: 'search', label: 'Web Search' },
];

export default function Sidebar({
  chats,
  activeId,
  onSelectChat,
  onNewChat,
  isOpen,
  onToggle,
  activeTool,
  onToolChange,
}: SidebarProps) {
  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : '-100%',
        }}
        transition={{ type: 'spring', damping: 28, stiffness: 180 }}
        className="fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-bg-secondary/95 backdrop-blur-xl border-r border-border-subtle flex flex-col lg:translate-x-0"
      >
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold text-text-primary">Gemini</span>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-3 border-b border-border-subtle">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={onNewChat}
            className="w-full"
          >
            New Chat
          </Button>
        </div>

        {/* Tools Section */}
        <div className="border-b border-border-subtle">
          <div className="px-3 py-2">
            <h3 className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Tools</h3>
          </div>
          <div className="px-2 py-2 space-y-0.5">
            {tools.map((tool) => {
              const Icon = toolIcons[tool.id];
              return (
                <motion.button
                  key={tool.id}
                  onClick={() => onToolChange(tool.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`
                    w-full px-2.5 py-2 rounded-lg text-left
                    flex items-center gap-2.5
                    transition-all duration-200
                    ${
                      activeTool === tool.id
                        ? 'bg-accent-primary/15 text-text-primary border border-accent-primary/30'
                        : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary border border-transparent'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-[13px]">{tool.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Recent Chats Section */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-2 border-b border-border-subtle">
            <h3 className="text-[10px] font-medium text-text-muted uppercase tracking-wider">Recent Chats</h3>
          </div>
          <div className="px-2 py-2">
            {chats.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 text-center text-text-muted text-xs"
              >
                No conversations yet
              </motion.div>
            ) : (
              <div className="space-y-0.5">
                {chats.map((chat) => (
                  <motion.button
                    key={chat.id}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectChat(chat.id)}
                    className={`
                      w-full px-2.5 py-2 rounded-lg text-left
                      flex items-center gap-2
                      transition-all duration-200
                      ${
                        activeId === chat.id
                          ? 'bg-accent-primary/12 text-text-primary border border-accent-primary/25'
                          : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary border border-transparent'
                      }
                    `}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate text-[13px]">{chat.title}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Settings & Profile */}
        <div className="border-t border-border-subtle mt-auto">
          <motion.button
            whileHover={{ x: 2 }}
            className="w-full px-3 py-2.5 flex items-center gap-2.5 text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-[13px]">Settings</span>
          </motion.button>
          <motion.button
            whileHover={{ x: 2 }}
            className="w-full px-3 py-2.5 flex items-center gap-2.5 text-text-secondary hover:bg-white/[0.03] hover:text-text-primary transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="text-[13px]">Profile</span>
          </motion.button>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-subtle">
          <p className="text-[10px] text-text-muted tracking-wide">
            Gemini Clone v1.0
          </p>
        </div>
      </motion.aside>

      {/* Mobile Toggle Button */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={onToggle}
          className="fixed top-4 left-4 z-30 lg:hidden p-2.5 glass rounded-xl hover:bg-white/10 transition-colors"
        >
          <Menu className="w-4 h-4 text-text-primary" />
        </motion.button>
      )}
    </>
  );
}
