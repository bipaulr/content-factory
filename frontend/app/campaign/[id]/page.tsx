'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/navigation';
import { GradientButton } from '@/components/gradient-button';
import { StatusBadge } from '@/components/status-badge';
import { ContentTabs } from '@/components/content-tabs';
import { ToastProvider, useToast } from '@/components/toast-provider';
import {
  getCampaign,
  getFeedbackHistory,
  regenerateBlog,
  regenerateSocial,
  regenerateEmail,
  exportClipboard,
  exportZip,
  type Campaign,
  type FeedbackMessage,
} from '@/lib/api';

function CampaignDetailContent({ id }: { id: string }) {
  const { showToast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [showSourceText, setShowSourceText] = useState(false);

  useEffect(() => {
    const loadCampaign = async () => {
      try {
        const [campaignData, feedbackData] = await Promise.all([
          getCampaign(id),
          getFeedbackHistory(id),
        ]);
        setCampaign(campaignData);
        setFeedbackHistory(feedbackData.feedback_history || []);
      } catch (error) {
        console.log(' Error loading campaign:', error);
        showToast('error', 'Failed to load campaign details.');
      } finally {
        setLoading(false);
      }
    };

    loadCampaign();
  }, [id, showToast]);

  const handleRegenerate = async (type: 'blog' | 'social' | 'email') => {
    setRegenerating(type);
    try {
      let result;
      switch (type) {
        case 'blog':
          result = await regenerateBlog(id);
          if (campaign) {
            setCampaign({
              ...campaign,
              content: { ...campaign.content!, blog_post: result.blog_post },
            });
          }
          break;
        case 'social':
          result = await regenerateSocial(id);
          if (campaign) {
            setCampaign({
              ...campaign,
              content: { ...campaign.content!, social_thread: result.social_thread },
            });
          }
          break;
        case 'email':
          result = await regenerateEmail(id);
          if (campaign) {
            setCampaign({
              ...campaign,
              content: { ...campaign.content!, email_teaser: result.email_teaser },
            });
          }
          break;
      }
      showToast('success', `${type.charAt(0).toUpperCase() + type.slice(1)} content regenerated!`);
    } catch (error) {
      console.log(' Error regenerating content:', error);
      showToast('error', `Failed to regenerate ${type} content.`);
    } finally {
      setRegenerating(null);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const result = await exportClipboard(id);
      await navigator.clipboard.writeText(result.formatted_html);
      showToast('success', 'Content copied to clipboard!');
    } catch (error) {
      console.log(' Error copying to clipboard:', error);
      showToast('error', 'Failed to copy to clipboard.');
    }
  };

  const handleDownloadZip = async () => {
    try {
      const blob = await exportZip(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('success', 'Download started!');
    } catch (error) {
      console.log(' Error downloading zip:', error);
      showToast('error', 'Failed to download ZIP file.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d4ff]" />
          </div>
        </main>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center py-24">
            <h2 className="text-2xl font-bold text-white mb-4">Campaign Not Found</h2>
            <p className="text-[#808080] mb-6">The campaign you are looking for does not exist.</p>
            <Link href="/">
              <GradientButton variant="primary">Go to Dashboard</GradientButton>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">Campaign Details</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-[#808080]">
              Campaign ID: <code className="text-[#00d4ff] font-mono">{campaign.id}</code>
            </p>
          </div>
          <div className="flex gap-3">
            <GradientButton variant="primary" onClick={handleCopyToClipboard}>
              Copy to Clipboard
            </GradientButton>
            <GradientButton variant="secondary" onClick={handleDownloadZip}>
              Download ZIP
            </GradientButton>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Source & Facts */}
          <div className="lg:col-span-1 space-y-6">
            {/* Source Text */}
            <div className="bg-[#252525] rounded-lg border border-[#3a3a3a] p-6">
              <button
                onClick={() => setShowSourceText(!showSourceText)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-semibold text-white">Source Text</h3>
                <svg
                  className={`w-5 h-5 text-[#808080] transition-transform ${showSourceText ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSourceText && (
                <p className="text-sm text-[#b0b0b0] mt-4 whitespace-pre-wrap">
                  {campaign.source_text}
                </p>
              )}
            </div>

            {/* Fact Sheet */}
            {campaign.fact_sheet && (
              <div className="bg-[#252525] rounded-lg border border-[#3a3a3a] p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Fact Sheet</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-[#808080] uppercase">Product Name</span>
                    <p className="text-sm text-white">{campaign.fact_sheet.product_name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#808080] uppercase">Target Audience</span>
                    <p className="text-sm text-white">{campaign.fact_sheet.target_audience}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[#808080] uppercase">Value Proposition</span>
                    <p className="text-sm text-white">{campaign.fact_sheet.value_proposition}</p>
                  </div>
                  {campaign.fact_sheet.core_features && campaign.fact_sheet.core_features.length > 0 && (
                  <div>
                    <span className="text-xs text-[#808080] uppercase">Core Features</span>
                    <ul className="mt-1 space-y-1">
                      {campaign.fact_sheet.core_features.map((feature, index) => (
                        <li key={index} className="text-sm text-[#b0b0b0] flex items-start gap-2">
                          <span className="text-[#00d4ff]">-</span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>                  )}                </div>
              </div>
            )}

            {/* Review Status */}
            {campaign.review && (
              <div className="bg-[#252525] rounded-lg border border-[#3a3a3a] p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Editor Review</h3>
                
                {campaign.review.status === 'approved' ? (
                  <div className="bg-[#06e796] border border-[#06ffa5]/30 rounded-lg p-3">
                    <span className="text-sm font-medium text-black">All content approved</span>
                  </div>
                ) : (
                  <>
                    <div className="bg-[#f8d25e] border border-[#ffd60a]/30 rounded-lg p-3 mb-4">
                      <span className="text-sm font-medium text-black">Needs Revision</span>
                    </div>
                    
                    {/* Parse and display feedback by type */}
                    <div className="space-y-3">
                      {campaign.review.feedback.split(' | ').map((item, idx) => {
                        const [type, ...messageParts] = item.split(': ');
                        const message = messageParts.join(': ');
                        
                        const typeColors: Record<string, string> = {
                          'Blog': 'bg-[#00d4ff] border-l-4 border-[#00d4ff]',
                          'Social': 'bg-[#06ffa5] border-l-4 border-[#06ffa5]',
                          'Email': 'bg-[#ffd60a] border-l-4 border-[#ffd60a]',
                        };
                        
                        return (
                          <div key={idx} className={`p-3 rounded ${typeColors[type.trim()] || 'bg-[#3e4040]'}`}>
                            <span className="text-xs font-semibold text-black uppercase">{type}</span>
                            <p className="text-sm text-black mt-1">{message.trim()}</p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Content */}
          <div className="lg:col-span-2">
            <div className="bg-[#252525] rounded-lg border border-[#3a3a3a] p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Generated Content</h3>
                <div className="flex gap-2">
                  <GradientButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate('blog')}
                    disabled={regenerating !== null}
                    isLoading={regenerating === 'blog'}
                  >
                    Regenerate Blog
                  </GradientButton>
                  <GradientButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate('social')}
                    disabled={regenerating !== null}
                    isLoading={regenerating === 'social'}
                  >
                    Regenerate Social
                  </GradientButton>
                  <GradientButton
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerate('email')}
                    disabled={regenerating !== null}
                    isLoading={regenerating === 'email'}
                  >
                    Regenerate Email
                  </GradientButton>
                </div>
              </div>

              <ContentTabs
                blogContent={campaign.content?.blog_post}
                socialContent={campaign.content?.social_thread}
                emailContent={campaign.content?.email_teaser}
              />
            </div>

            {/* Feedback History */}
            {feedbackHistory.length > 0 && (
              <div className="bg-[#252525] rounded-lg border border-[#3a3a3a] p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Feedback History</h3>
                <div className="space-y-4">
                  {feedbackHistory.map((item, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        item.agent === 'researcher'
                          ? 'bg-[#00d4ff]'
                          : item.agent === 'copywriter'
                          ? 'bg-[#06ffa5]'
                          : item.agent === 'editor'
                          ? 'bg-[#ffd60a]'
                          : 'bg-[#808080]/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={` text-lg font-semibold capitalize ${
                          item.agent === 'researcher'
                            ? 'text-black'
                            : item.agent === 'copywriter'
                            ? 'text-black'
                            : item.agent === 'editor'
                            ? 'text-black'
                            : 'text-white'
                        }`}>
                          {item.agent}
                        </span>
                        <span className="text-xs text-[#808080]">
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className={`text-sm ${
                        item.agent === 'researcher' || item.agent === 'copywriter' || item.agent === 'editor'
                          ? 'text-black'
                          : 'text-white'
                      }`}>{item.message}</p>
                      {item.details && (
                        <p className="text-xs text-[#808080] mt-2 font-mono bg-[#1a1a1a] p-2 rounded">
                          {typeof item.details === 'string' ? item.details : JSON.stringify(item.details)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  return (
    <ToastProvider>
      <CampaignDetailContent id={id} />
    </ToastProvider>
  );
}
