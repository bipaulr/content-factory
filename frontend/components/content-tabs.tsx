'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ResponsivePreview } from './responsive-preview';
import { formatMarkdownContent, formatSocialPosts } from '@/lib/format';
import type { ContentTab, TabItem } from '@/lib/types';

const tabs: TabItem[] = [
  { id: 'blog', label: 'Blog Post' },
  { id: 'social', label: 'Social Media' },
  { id: 'email', label: 'Email Teaser' },
];

interface ContentTabsProps {
  blogContent?: string;
  socialContent?: string | string[];
  emailContent?: string;
  className?: string;
}

export function ContentTabs({ blogContent, socialContent, emailContent, className }: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState<ContentTab>('blog');
  const [viewMode, setViewMode] = useState<'structured' | 'preview'>('structured');

  const renderContent = () => {
    switch (activeTab) {
      case 'blog':
        return blogContent ? (
          <div className="prose prose-invert max-w-none">
            <div className="text-[#b0b0b0] space-y-2">
              {formatMarkdownContent(blogContent).map((el, idx) => {
                switch (el.type) {
                  case 'h1':
                    return (
                      <h1 key={idx} className="text-2xl font-bold text-white mt-6 mb-4">
                        {el.text}
                      </h1>
                    );
                  case 'h2':
                    return (
                      <h2 key={idx} className="text-xl font-bold text-white mt-5 mb-3">
                        {el.text}
                      </h2>
                    );
                  case 'h3':
                    return (
                      <h3 key={idx} className="text-lg font-semibold text-[#00d4ff] mt-4 mb-2">
                        {el.text}
                      </h3>
                    );
                  case 'li':
                    return (
                      <li key={idx} className="text-[#b0b0b0] ml-6 mb-1 list-disc">
                        {el.text}
                      </li>
                    );
                  case 'p':
                    return (
                      <p key={idx} className="text-[#b0b0b0] mb-2 leading-relaxed">
                        {el.text}
                      </p>
                    );
                  case 'spacer':
                    return <div key={idx} className="h-3" />;
                  default:
                    return null;
                }
              })}
            </div>
          </div>
        ) : (
          <EmptyState message="No blog content generated yet." />
        );
      case 'social':
        if (!socialContent) {
          return <EmptyState message="No social content generated yet." />;
        }
        
        // Convert array to string if needed
        const socialContentStr = Array.isArray(socialContent) 
          ? socialContent.join('\n\n') 
          : socialContent;
        
        const parsedPlatforms = formatSocialPosts(socialContentStr);
        
        if (parsedPlatforms && parsedPlatforms.length > 0) {
          return (
            <div className="space-y-4">
              {parsedPlatforms.map((post) => (
                <div key={`post-${post.number}`} className="bg-[#1a1a1a] rounded-lg border border-[#3a3a3a] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[#00d4ff]">
                      Post {post.number}
                    </h3>
                    <span className="text-xs text-[#808080]">#{post.number}</span>
                  </div>
                  <p className="text-[#b0b0b0] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>
              ))}
            </div>
          );
        }
        
        // Fallback to original display if parsing fails
        return (
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-[#b0b0b0]">{socialContentStr}</div>
          </div>
        );
      case 'email':
        return emailContent ? (
          <div className="prose prose-invert max-w-none">
            <div className="text-[#b0b0b0] space-y-2 leading-relaxed">
              {formatMarkdownContent(emailContent).map((el, idx) => {
                switch (el.type) {
                  case 'h1':
                    return (
                      <h1 key={idx} className="text-2xl font-bold text-white mt-6 mb-4">
                        {el.text}
                      </h1>
                    );
                  case 'h2':
                    return (
                      <h2 key={idx} className="text-xl font-bold text-white mt-5 mb-3">
                        {el.text}
                      </h2>
                    );
                  case 'h3':
                    return (
                      <h3 key={idx} className="text-lg font-semibold text-[#00d4ff] mt-4 mb-2">
                        {el.text}
                      </h3>
                    );
                  case 'li':
                    return (
                      <li key={idx} className="text-[#b0b0b0] ml-6 mb-1 list-disc">
                        {el.text}
                      </li>
                    );
                  case 'p':
                    return (
                      <p key={idx} className="text-[#b0b0b0] mb-2 leading-relaxed">
                        {el.text}
                      </p>
                    );
                  case 'spacer':
                    return <div key={idx} className="h-3" />;
                  default:
                    return null;
                }
              })}
            </div>
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
            Structured
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
            Preview
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
              <ResponsivePreview 
                content={Array.isArray(socialContent) ? socialContent.join('\n\n') : socialContent} 
                title="Social Media" 
                type="social" 
              />
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
