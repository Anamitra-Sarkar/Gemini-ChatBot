"use client"

import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { Send, Square } from 'lucide-react';
import Button from '../ui/Button';

interface InputBoxProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  disabled?: boolean;
}

export default function InputBox({ onSend, isStreaming, onStop, disabled = false }: InputBoxProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const glowOpacity = useMotionValue(0);
  const glowSpring = useSpring(glowOpacity, { stiffness: 150, damping: 25 });

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  useEffect(() => {
    glowOpacity.set(isFocused ? 1 : 0);
  }, [isFocused, glowOpacity]);

  const handleSend = () => {
    if (!message.trim() || disabled || isStreaming) return;
    onSend(message.trim());
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 lg:left-64 pointer-events-none">
      <div className="px-6 lg:pl-12 lg:pr-24 pb-6 lg:pb-8 pointer-events-auto">
        <div className="max-w-4xl">
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 28,
              delay: 0.1,
            }}
            className="relative"
          >
            <motion.div
              className="absolute -inset-3 bg-gradient-to-r from-accent-primary/15 to-accent-secondary/15 rounded-3xl blur-2xl"
              style={{
                opacity: glowSpring,
              }}
            />
            
            <motion.div
              animate={{
                y: isFocused ? -2 : 0,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass bg-bg-elevated/95 backdrop-blur-xl rounded-2xl shadow-2xl relative"
            >
              <div className="p-3.5 lg:p-4 flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Ask anything..."
                  disabled={disabled || isStreaming}
                  rows={1}
                  className="
                    flex-1 bg-transparent resize-none
                    text-text-primary placeholder:text-text-muted
                    focus:outline-none
                    text-[15px] leading-relaxed
                    max-h-[200px]
                    disabled:opacity-50
                  "
                />
                <AnimatePresence mode="wait">
                  {isStreaming ? (
                    <motion.div
                      key="stop"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Square className="w-3.5 h-3.5" />}
                        onClick={onStop}
                        className="flex-shrink-0"
                      >
                        Stop
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.button
                      key="send"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      whileHover={{ 
                        scale: message.trim() ? 1.1 : 1,
                        rotate: message.trim() ? [0, -5, 5, 0] : 0,
                      }}
                      whileTap={{ scale: 0.88 }}
                      onClick={handleSend}
                      disabled={!message.trim() || disabled}
                      transition={{ type: "spring", stiffness: 500, damping: 20 }}
                      className={`
                        flex-shrink-0 w-9 h-9 rounded-xl
                        flex items-center justify-center
                        transition-all duration-300
                        ${
                          message.trim() && !disabled
                            ? 'bg-accent-primary hover:bg-accent-secondary text-white shadow-glow'
                            : 'bg-white/[0.04] text-text-muted cursor-not-allowed'
                        }
                      `}
                    >
                      <Send className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-[11px] text-text-muted mt-2.5 ml-1"
          >
            Gemini can make mistakes. Verify important information.
          </motion.p>
        </div>
      </div>
    </div>
  );
}
