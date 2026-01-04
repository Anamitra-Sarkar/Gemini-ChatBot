"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Download, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

export default function Canvas() {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Document');

  return (
    <div className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border-subtle p-4 flex items-center justify-between"
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-medium bg-transparent text-text-primary focus:outline-none"
          placeholder="Document title..."
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<Save className="w-4 h-4" />}>
            Save
          </Button>
          <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />}>
            Export
          </Button>
          <Button variant="secondary" size="sm" icon={<Sparkles className="w-4 h-4" />}>
            AI Enhance
          </Button>
        </div>
      </motion.div>

      <div className="flex-1 overflow-hidden flex">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 p-6 overflow-y-auto"
        >
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing... Use markdown for formatting."
            className="w-full h-full bg-transparent text-text-primary resize-none focus:outline-none text-base leading-relaxed"
          />
        </motion.div>

        {content && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-1/3 border-l border-border-subtle p-6 overflow-y-auto glass"
          >
            <h3 className="text-sm font-medium text-text-secondary mb-4">AI Suggestions</h3>
            <div className="space-y-3">
              <button className="w-full p-3 text-left glass rounded-lg hover:bg-white/5 transition-colors">
                <p className="text-xs text-accent-primary mb-1">Improve clarity</p>
                <p className="text-xs text-text-tertiary">Make this section more concise</p>
              </button>
              <button className="w-full p-3 text-left glass rounded-lg hover:bg-white/5 transition-colors">
                <p className="text-xs text-accent-primary mb-1">Add examples</p>
                <p className="text-xs text-text-tertiary">Include concrete examples</p>
              </button>
              <button className="w-full p-3 text-left glass rounded-lg hover:bg-white/5 transition-colors">
                <p className="text-xs text-accent-primary mb-1">Expand section</p>
                <p className="text-xs text-text-tertiary">Add more detail to this part</p>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
