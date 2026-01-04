"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/lib/api';

interface MessageBubbleProps {
  message: ChatMessage;
  index: number;
}

export default function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 22,
        delay: index * 0.02,
      }}
      className="flex gap-3.5 lg:gap-4 group"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: index * 0.02 + 0.1,
        }}
        className={`
          flex-shrink-0 w-8 h-8 lg:w-9 lg:h-9 rounded-xl
          flex items-center justify-center
          ${
            isUser
              ? 'bg-bg-tertiary text-text-secondary'
              : 'bg-gradient-to-br from-accent-primary via-accent-primary to-accent-secondary text-white shadow-lg shadow-accent-primary/20'
          }
        `}
      >
        {isUser ? <User className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <Sparkles className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          delay: index * 0.02 + 0.15,
          duration: 0.5,
          ease: [0.19, 1, 0.22, 1],
        }}
        className="flex-1 space-y-1.5 min-w-0"
      >
        <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
          {isUser ? 'You' : 'Gemini'}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            delay: index * 0.02 + 0.25,
            duration: 0.4,
            ease: [0.19, 1, 0.22, 1],
          }}
          className={`
            rounded-xl lg:rounded-2xl p-3.5 lg:p-4
            ${
              isUser
                ? 'bg-bg-tertiary/80 text-text-primary'
                : 'glass text-text-primary backdrop-blur-xl'
            }
            prose prose-invert prose-sm max-w-none
            prose-p:leading-relaxed prose-p:my-1.5
            prose-pre:bg-bg-primary prose-pre:border prose-pre:border-border-subtle prose-pre:text-xs
            prose-code:text-accent-primary prose-code:bg-bg-tertiary/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-headings:text-text-primary prose-headings:font-semibold prose-headings:tracking-tight
            prose-a:text-accent-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-text-primary prose-strong:font-semibold
            prose-ul:my-2 prose-ol:my-2
            prose-li:my-0.5 prose-li:text-sm
            group-hover:shadow-lg transition-shadow duration-300
          `}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
