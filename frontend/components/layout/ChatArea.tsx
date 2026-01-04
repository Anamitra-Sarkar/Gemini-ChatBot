"use client"

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { ChatMessage } from '@/lib/api';

interface ChatAreaProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  isEmpty: boolean;
  onPromptClick?: (prompt: string) => void;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.92 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 18,
      delay: custom * 0.08,
    }
  })
};

export default function ChatArea({ messages, isStreaming, isEmpty, onPromptClick }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current && containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      
      if (isNearBottom) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages]);

  const prompts = [
    { text: 'Explain how neural networks learn from data', cols: 2, offset: 0 },
    { text: 'Write a haiku', cols: 1, offset: 12 },
    { text: 'Debug Python code', cols: 1, offset: 6 },
    { text: 'Tokyo itinerary with local food spots', cols: 2, offset: 0 },
    { text: 'Summarize latest AI research', cols: 1, offset: 8 },
  ];

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 lg:pl-12 lg:pr-24 py-6 lg:py-10">
      {isEmpty ? (
        <div className="max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
            className="mb-24 lg:mb-32"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <motion.div
                animate={{
                  rotate: [0, 8, -8, 0],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: [0.45, 0, 0.55, 1],
                }}
                className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center"
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </motion.div>
              <h1 className="text-base font-medium text-text-secondary tracking-tight">Gemini</h1>
            </div>
            <p className="text-xs text-text-muted max-w-xs leading-relaxed">
              Ask anything. Research, write, code, create.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-4 gap-2.5 lg:gap-3 max-w-6xl"
          >
            {prompts.map((prompt, i) => (
              <motion.button
                key={i}
                custom={i}
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  scale: 1.015,
                  transition: { 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 25 
                  }
                }}
                whileTap={{ 
                  scale: 0.97,
                  transition: { duration: 0.1 }
                }}
                onClick={() => onPromptClick?.(prompt.text)}
                className={`
                  col-span-1 md:col-span-${prompt.cols}
                  glass p-3.5 lg:p-4 rounded-xl text-left
                  text-sm text-text-secondary
                  hover:text-text-primary hover:border-white/15
                  transition-colors duration-200
                  group relative overflow-hidden
                `}
                style={{
                  marginTop: `${prompt.offset}px`,
                }}
              >
                <span className="relative z-10 block">{prompt.text}</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-accent-primary/8 to-accent-secondary/4 opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3 }}
                />
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.4 }}
                />
              </motion.button>
            ))}
          </motion.div>
        </div>
      ) : (
        <div className="max-w-4xl space-y-6 lg:space-y-8">
          <AnimatePresence mode="popLayout">
            {messages.map((message, index) => (
              <MessageBubble key={message.id} message={message} index={index} />
            ))}
          </AnimatePresence>
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex gap-1.5 items-center text-text-tertiary ml-14"
            >
              {[0, 0.15, 0.3].map((delay, i) => (
                <motion.span
                  key={i}
                  animate={{ 
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{ 
                    duration: 1.4, 
                    repeat: Infinity, 
                    delay,
                    ease: [0.45, 0, 0.55, 1],
                  }}
                  className="w-1.5 h-1.5 rounded-full bg-current"
                />
              ))}
            </motion.div>
          )}
        </div>
      )}
      <div ref={bottomRef} className="h-48" />
    </div>
  );
}
