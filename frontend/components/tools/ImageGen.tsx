"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Image, Sparkles, Download } from 'lucide-react';
import Button from '../ui/Button';

export default function ImageGen() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 2000);
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
              <Image className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Image Generation</h2>
          </div>
          <p className="text-sm text-text-tertiary">Describe the image you want to create</p>
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
            placeholder="A serene mountain landscape at sunset with clouds..."
            className="w-full h-32 p-4 glass rounded-xl bg-bg-elevated text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          />
          
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generating}
            loading={generating}
            icon={<Sparkles className="w-4 h-4" />}
            className="w-full"
          >
            {generating ? 'Generating...' : 'Generate Image'}
          </Button>
        </motion.div>

        {generated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <div className="glass rounded-2xl overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 flex items-center justify-center">
                <div className="text-center">
                  <Image className="w-16 h-16 text-accent-primary mx-auto mb-4 opacity-50" />
                  <p className="text-text-tertiary text-sm">Generated Image Placeholder</p>
                  <p className="text-text-muted text-xs mt-2 max-w-md">
                    {prompt}
                  </p>
                </div>
              </div>
              <div className="p-4 border-t border-border-subtle flex justify-end">
                <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>
                  Download
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
