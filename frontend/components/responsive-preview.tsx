'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatMarkdownContent, formatSocialPosts } from '@/lib/format';
import { FaHeart, FaRetweet, FaShare } from 'react-icons/fa';

type DeviceType = 'mobile' | 'desktop';
type ContentType = 'blog' | 'social' | 'email';

interface ResponsivePreviewProps {
  content: string;
  title: string;
  type: ContentType;
  className?: string;
}

export function ResponsivePreview({ content, title, type, className }: ResponsivePreviewProps) {
  const [device, setDevice] = useState<DeviceType>('mobile');

  const renderBlogContent = () => {
    const formatted = formatMarkdownContent(content);
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">{title}</h1>
          <div className="flex items-center gap-2 text-[#808080] text-sm">
            <span>By Content Factory</span>
            <span>•</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
        </div>
        <div className="h-48 bg-gradient-to-r from-[#00d4ff] to-[#06E796] mb-6"></div>
        <article className="prose prose-invert max-w-none space-y-2">
          {formatted.map((el, idx) => {
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
        </article>
      </div>
    );
  };

  const renderSocialContent = () => {
    const posts = formatSocialPosts(content);
    return (
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={`post-${post.number}`} className="border border-[#3a3a3a] p-4 hover:bg-[#0a0a0a]/50 transition">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#00d4ff] to-[#06E796]"></div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">Content Factory</span>
                  <span className="text-[#808080]">@contentfactory</span>
                  <span className="text-[#808080]">·</span>
                  <span className="text-[#808080]">now</span>
                </div>
                {post.platform && (
                  <span className="text-xs text-[#00d4ff] mt-1">{post.platform}</span>
                )}
              </div>
            </div>
            <p className="text-[#b0b0b0] mb-4 leading-relaxed whitespace-pre-wrap">{post.content}</p>
            <div className="flex items-center justify-between text-[#808080] text-sm max-w-xs">
              <div className="flex items-center gap-2 hover:text-[#00d4ff] cursor-pointer">
                <span>💬</span>
                <span>42</span>
              </div>
              <div className="flex items-center gap-2 hover:text-[#06E796] cursor-pointer">
                <FaRetweet className="w-4 h-4" />
                <span>128</span>
              </div>
              <div className="flex items-center gap-2 hover:text-[#ff006e] cursor-pointer">
                <FaHeart className="w-4 h-4" />
                <span>342</span>
              </div>
              <div className="flex items-center gap-2 hover:text-[#00d4ff] cursor-pointer">
                <FaShare className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEmailContent = () => {
    const formatted = formatMarkdownContent(content);
    return (
      <div className="space-y-4">
        <div className="bg-[#1a1a1a] border border-[#3a3a3a] p-4">
          <p className="text-[#808080] text-sm mb-3">From: campaigns@contentfactory.io</p>
          <p className="text-[#808080] text-sm mb-4">Subject: {title}</p>
        </div>
        <div className="bg-white text-[#0a0a0a] p-6 space-y-3">
          <article className="font-sans text-sm leading-relaxed">
            {formatted.map((el, idx) => {
              switch (el.type) {
                case 'h1':
                  return (
                    <h1 key={idx} className="text-2xl font-bold text-[#0a0a0a] mt-6 mb-4">
                      {el.text}
                    </h1>
                  );
                case 'h2':
                  return (
                    <h2 key={idx} className="text-xl font-bold text-[#0a0a0a] mt-5 mb-3">
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
                    <li key={idx} className="text-[#0a0a0a] ml-6 mb-1 list-disc">
                      {el.text}
                    </li>
                  );
                case 'p':
                  return (
                    <p key={idx} className="text-[#0a0a0a] mb-2 leading-relaxed">
                      {el.text}
                    </p>
                  );
                case 'spacer':
                  return <div key={idx} className="h-3" />;
                default:
                  return null;
              }
            })}
          </article>
          <div className="pt-4 border-t border-gray-300">
            <button className="bg-[#00d4ff] text-[#0a0a0a] px-6 py-2 font-semibold hover:brightness-110">
              View Full Campaign
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (type) {
      case 'blog':
        return renderBlogContent();
      case 'social':
        return renderSocialContent();
      case 'email':
        return renderEmailContent();
      default:
        return null;
    }
  };

  return (
    <div className={cn('', className)}>
      {/* Device Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">{title} Preview</h3>
        <div className="flex gap-2 bg-[#1a1a1a] p-1">
          <button
            onClick={() => setDevice('mobile')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-all',
              device === 'mobile'
                ? 'bg-[#00d4ff] text-[#0a0a0a]'
                : 'text-[#808080] hover:text-white'
            )}
          >
            📱 Mobile
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-all',
              device === 'desktop'
                ? 'bg-[#00d4ff] text-[#0a0a0a]'
                : 'text-[#808080] hover:text-white'
            )}
          >
            💻 Desktop
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex justify-center">
        {device === 'mobile' ? (
          // Mobile Preview
          <div className="w-full max-w-sm">
            {/* Phone Frame */}
            <div className="bg-black border-8 border-gray-800 shadow-2xl overflow-hidden">
              {/* Phone Notch */}
              <div className="bg-black h-6 flex justify-center items-center">
                <div className="w-32 h-5 bg-black"></div>
              </div>

              {/* Phone Status Bar */}
              <div className="bg-[#0a0a0a] px-4 py-2 flex justify-between items-center text-white text-xs border-b border-[#3a3a3a]">
                <span>9:41</span>
                <div className="flex gap-1">📶 📡 🔋</div>
              </div>

              {/* Screen Content */}
              <div className="bg-[#0a0a0a] p-4 min-h-[600px] max-h-[600px] overflow-y-auto">
                {renderContent()}
              </div>

              {/* Phone Bottom */}
              <div className="bg-black h-6"></div>
            </div>
            <p className="text-center text-[#808080] text-sm mt-4">Mobile Screen (375px)</p>
          </div>
        ) : (
          // Desktop Preview
          <div className="w-full">
            {/* Browser Frame */}
            <div className="bg-[#1e2021] border-2 border-[#3a3a3a] shadow-2xl overflow-hidden">
              {/* Browser Toolbar */}
              <div className="bg-[#1a1a1a] px-4 py-3 flex items-center gap-3 border-b border-[#3a3a3a]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-[#ff6058]"></div>
                  <div className="w-3 h-3 bg-[#ffbd2e]"></div>
                  <div className="w-3 h-3 bg-[#28c940]"></div>
                </div>
                <div className="flex-1 ml-4 text-[#808080] text-xs">
                  {type === 'blog' ? 'blogsample.com' : type === 'social' ? 'twitter.com/home' : 'email-preview'}
                </div>
              </div>

              {/* Content Area */}
              <div className="bg-[#0a0a0a] p-8">
                <div className={cn(
                  'bg-[#1a1a1a] p-8 min-h-[500px]',
                  type === 'blog' && 'max-w-3xl mx-auto',
                  type === 'social' && 'max-w-2xl mx-auto'
                )}>
                  {renderContent()}
                </div>
              </div>
            </div>
            <p className="text-center text-[#808080] text-sm mt-4">Desktop Screen (1200px+)</p>
          </div>
        )}
      </div>
    </div>
  );
}
