"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Search, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export default function WebSearch() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    setSearching(true);
    setSearched(true);
    
    setTimeout(() => {
      setResults([
        {
          title: 'Search Result 1',
          url: 'https://example.com/1',
          snippet: 'This is a placeholder search result. Web search API is not configured.',
        },
        {
          title: 'Search Result 2',
          url: 'https://example.com/2',
          snippet: 'Configure Tavily API to enable real web search functionality.',
        },
        {
          title: 'Search Result 3',
          url: 'https://example.com/3',
          snippet: 'The application works without external APIs in demo mode.',
        },
      ]);
      setSearching(false);
    }, 1500);
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">Web Search</h2>
          </div>
          <p className="text-sm text-text-tertiary">Search the internet with AI assistance</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !searching && query.trim() && handleSearch()}
              placeholder="What do you want to search for?"
              className="flex-1 p-4 glass rounded-xl bg-bg-elevated text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
            />
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || searching}
              loading={searching}
              icon={<Search className="w-4 h-4" />}
            >
              Search
            </Button>
          </div>
        </motion.div>

        {searched && !searching && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-text-tertiary">No results found</p>
          </motion.div>
        )}

        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {results.map((result, i) => (
              <motion.a
                key={i}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ x: 4 }}
                className="block glass p-4 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-text-primary font-medium mb-1 group-hover:text-accent-primary transition-colors">
                      {result.title}
                    </h3>
                    <p className="text-sm text-text-tertiary mb-2">{result.snippet}</p>
                    <p className="text-xs text-text-muted truncate">{result.url}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-text-muted flex-shrink-0 mt-1 group-hover:text-accent-primary transition-colors" />
                </div>
              </motion.a>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
