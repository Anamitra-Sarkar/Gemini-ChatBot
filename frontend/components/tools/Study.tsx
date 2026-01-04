"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Sparkles, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';

interface Flashcard {
  front: string;
  back: string;
}

export default function Study() {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'input' | 'flashcards' | 'quiz'>('input');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const generateFlashcards = () => {
    const cards: Flashcard[] = [
      { front: `What is ${topic}?`, back: `${topic} is a fundamental concept that...` },
      { front: `Key principles of ${topic}?`, back: `The main principles include...` },
      { front: `Applications of ${topic}?`, back: `${topic} is used in various fields...` },
      { front: `History of ${topic}?`, back: `${topic} was first discovered...` },
    ];
    setFlashcards(cards);
    setMode('flashcards');
    setCurrentCard(0);
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {mode === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-lg w-full"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">Study & Learn</h2>
                <p className="text-sm text-text-tertiary">Generate flashcards and quizzes</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What do you want to learn?"
                className="w-full p-4 glass rounded-xl bg-bg-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
              />
              <Button
                onClick={generateFlashcards}
                disabled={!topic.trim()}
                icon={<Sparkles className="w-4 h-4" />}
                className="w-full"
              >
                Generate Flashcards
              </Button>
            </div>
          </motion.div>
        )}

        {mode === 'flashcards' && flashcards.length > 0 && (
          <motion.div
            key="flashcards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full"
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-lg font-medium text-text-primary">
                Card {currentCard + 1} of {flashcards.length}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setMode('input')}>
                New Topic
              </Button>
            </div>

            <motion.div
              onClick={() => setFlipped(!flipped)}
              className="glass p-8 rounded-2xl min-h-[300px] flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={flipped ? 'back' : 'front'}
                  initial={{ opacity: 0, rotateY: 90 }}
                  animate={{ opacity: 1, rotateY: 0 }}
                  exit={{ opacity: 0, rotateY: -90 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl text-text-primary text-center"
                >
                  {flipped ? flashcards[currentCard].back : flashcards[currentCard].front}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                disabled={currentCard === 0}
                onClick={() => {
                  setCurrentCard(currentCard - 1);
                  setFlipped(false);
                }}
              >
                Previous
              </Button>
              <p className="text-xs text-text-muted">Click card to flip</p>
              <Button
                variant="ghost"
                disabled={currentCard === flashcards.length - 1}
                onClick={() => {
                  setCurrentCard(currentCard + 1);
                  setFlipped(false);
                }}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
