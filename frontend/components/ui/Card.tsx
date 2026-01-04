"use client"

import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  glass?: boolean;
}

export default function Card({ children, className = '', hoverable = false, glass = true }: CardProps) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2, scale: 1.01 } : {}}
      transition={{ duration: 0.2 }}
      className={`
        ${glass ? 'glass' : 'bg-bg-elevated border border-border-default'}
        rounded-xl p-4
        transition-all duration-200
        ${hoverable ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}
