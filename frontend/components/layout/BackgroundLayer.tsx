"use client"

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function BackgroundLayer() {
  const { scrollY } = useScroll();
  
  const y1 = useTransform(scrollY, [0, 1000], [0, -200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, 100]);
  const y3 = useTransform(scrollY, [0, 1000], [0, -150]);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orb 1 */}
      <motion.div
        style={{ y: y1 }}
        animate={{
          x: [0, 100, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-0 -right-20 w-[500px] h-[500px] rounded-full bg-accent-primary/10 blur-[120px]"
      />
      
      {/* Gradient orb 2 */}
      <motion.div
        style={{ y: y2 }}
        animate={{
          x: [0, -80, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
        className="absolute top-1/3 -left-40 w-[600px] h-[600px] rounded-full bg-accent-secondary/8 blur-[140px]"
      />
      
      {/* Gradient orb 3 */}
      <motion.div
        style={{ y: y3 }}
        animate={{
          x: [0, 60, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
        className="absolute bottom-20 right-1/4 w-[400px] h-[400px] rounded-full bg-indigo-400/5 blur-[100px]"
      />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }} />
    </div>
  );
}
