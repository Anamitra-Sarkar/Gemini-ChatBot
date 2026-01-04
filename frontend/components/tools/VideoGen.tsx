"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Sparkles, Play } from 'lucide-react';
import Button from '../ui/Button';

export default function VideoGen() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setProgress(0);
    setGenerated(false);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setGenerating(false);
          setGenerated(true);
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Video Generation</h2>
          </div>
          <p className="text-sm text-text-tertiary">Create videos from text descriptions</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A time-lapse of a flower blooming in spring..."
            className="w-full h-32 p-4 glass rounded-xl bg-bg-elevated text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            disabled={generating}
          />
          
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            loading={generating}
            icon={<Sparkles className="w-4 h-4" />}
            className="w-full"
          >
            {generating ? 'Generating...' : 'Generate Video'}
          </Button>
        </motion.div>

        {generating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass p-6 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-secondary">Generating video...</span>
              <span className="text-sm text-accent-primary font-medium">{progress}%</span>
            </div>
            <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}

        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="glass rounded-2xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center relative group cursor-pointer">
                <div className="text-center">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <Play className="w-8 h-8 text-accent-primary ml-1" />
                  </motion.div>
                  <p className="text-text-tertiary text-sm">Video Preview</p>
                  <p className="text-text-muted text-xs mt-2 max-w-md">
                    {prompt}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
