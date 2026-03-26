'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ResponsivePreview } from './responsive-preview';
import type { ContentTab, TabItem } from '@/lib/types';

const tabs: TabItem[] = [
  { id: 'blog', label: 'Blog Post' },
  { id: 'social', label: 'Social Media' },
  { id: 'email', label: 'Email Teaser' },
];

interface ContentTabsProps {
  blogContent?: string;
  socialContent?: string;
  emailContent?: string;
  className?: string;
}

export function ContentTabs({ blogContent, socialContent, emailContent, className }: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>('blog');
  const [viewMode, setViewMode] = useState<'structured' | 'preview'>('structured');

  const parseSocialContent = (content: string) => {
    // Split by numbered posts: 1/, 2/, 3/, etc.
    const postRegex = /^\d+\/\s/gm;
    
    if (!postRegex.test(content)) {
      // If no numbered format found, return null to use fallback
      return null;
    }

    // Split by the numbered pattern
    const posts = content.split(/^\d+\/\s/gm).filter(p => p.trim());
    
    return posts.map((post, idx) => ({
      number: idx + 1,
      content: post.trim()
    }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'blog':
        return blogContent ? (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-[#b0b0b0]">{blogContent}</div>
          </div>
        ) : (
          <EmptyState message="No blog content generated yet." />
        );
      case 'social':
        if (!socialContent) {
          return <EmptyState message="No social content generated yet." />;
        }
        
        const parsedPlatforms = parseSocialContent(socialContent);
        
        if (parsedPlatforms && parsedPlatforms.length > 0) {
          return (
            <div className="space-y-4">
              {parsedPlatforms.map((post, idx) => (
                <div key={idx} className="bg-[#1a1a1a] rounded-lg border border-[#3a3a3a] p-4">
                  <h3 className="text-sm font-semibold text-[#00d4ff] mb-2">Post {post.number}</h3>
                  <p className="text-[#b0b0b0] whitespace-pre-wrap">{post.content}</p>
                </div>
              ))}
            </div>
          );
        }
        
        // Fallback to original display if parsing fails
        return (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-[#b0b0b0]">{socialContent}</div>
          </div>
        );
      case 'email':
        return emailContent ? (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-[#b0b0b0]">{emailContent}</div>
          </div>
        ) : (
          <EmptyState message="No email content generated yet." />
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("", className)}>
      {/* Tab Headers and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex border-b border-[#3a3a3a]">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-4 py-3 text-sm font-medium transition-all duration-200 relative",
                activeTab === tab.id
                  ? "text-white"
                  : "text-[#808080] hover:text-[#b0b0b0]"
              )}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00d4ff]" />
              )}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 bg-[#1a1a1a] rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewMode('structured')}
            className={cn(
              'px-3 py-2 rounded text-xs sm:text-sm font-medium transition-all',
              viewMode === 'structured'
                ? 'bg-[#00d4ff] text-[#0a0a0a]'
                : 'text-[#808080] hover:text-white'
            )}
          >
            📋 Structured
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              'px-3 py-2 rounded text-xs sm:text-sm font-medium transition-all',
              viewMode === 'preview'
                ? 'bg-[#00d4ff] text-[#0a0a0a]'
                : 'text-[#808080] hover:text-white'
            )}
          >
            👁️ Preview
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {viewMode === 'preview' ? (
          <>
            {activeTab === 'blog' && blogContent && (
              <ResponsivePreview content={blogContent} title="Blog Post" type="blog" />
            )}
            {activeTab === 'social' && socialContent && (
              <ResponsivePreview content={socialContent} title="Social Media" type="social" />
            )}
            {activeTab === 'email' && emailContent && (
              <ResponsivePreview content={emailContent} title="Email Teaser" type="email" />
            )}
            {!blogContent && !socialContent && !emailContent && (
              <EmptyState message="No content to preview." />
            )}
          </>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-[#808080]">
      <p>{message}</p>
    </div>
  );
}
