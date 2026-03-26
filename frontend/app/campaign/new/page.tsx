'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaInfo, FaStar } from 'react-icons/fa';
import { LuTarget } from 'react-icons/lu';
import { Navigation } from '@/components/navigation';
import { GradientButton } from '@/components/gradient-button';
import { AgentTimeline } from '@/components/agent-timeline';
import { ProgressBar } from '@/components/progress-bar';
import { ToastProvider, useToast } from '@/components/toast-provider';
import { createCampaignAsync, createCampaignStream, uploadFileAndCreateCampaign, createCampaignFromUrl } from '@/lib/api';
import type { AgentMessage } from '@/lib/types';

function NewCampaignContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const [inputMode, setInputMode] = useState<'text' | 'file' | 'url'>('text');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [progress, setProgress] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSubmit = useCallback(async () => {
    let contentText = '';
    let response;

    if (inputMode === 'text') {
      if (!inputText.trim()) {
        showToast('error', 'Please enter product description text.');
        return;
      }
      contentText = inputText;
    } else if (inputMode === 'file') {
      if (!selectedFile) {
        showToast('error', 'Please select a file to upload.');
        return;
      }
    } else if (inputMode === 'url') {
      if (!inputUrl.trim()) {
        showToast('error', 'Please enter a URL.');
        return;
      }
    }

    setIsProcessing(true);
    setMessages([]);
    setProgress(0);

    try {
      if (inputMode === 'text') {
        response = await createCampaignAsync(contentText);
      } else if (inputMode === 'file' && selectedFile) {
        response = await uploadFileAndCreateCampaign(selectedFile);
      } else if (inputMode === 'url') {
        response = await createCampaignFromUrl(inputUrl);
      }

      if (!response) {
        throw new Error('Failed to create campaign');
      }

      setCampaignId(response.campaign_id);
      showToast('info', `Campaign ${response.campaign_id} started!`);

      // Start SSE stream
      const eventSource = createCampaignStream(response.campaign_id);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.event === 'status_update') {
            const newMessage: AgentMessage = {
              id: Math.random().toString(36).substring(2, 9),
              agent: data.data.agent || 'system',
              message: data.data.message || data.data.status,
              timestamp: new Date(),
              status: 'processing',
            };
            setMessages((prev) => [...prev, newMessage]);
            
            if (data.data.progress) {
              setProgress(data.data.progress);
            }
          } else if (data.event === 'campaign_complete') {
            setProgress(100);
            showToast('success', 'Campaign completed successfully!');
            eventSource.close();
            
            // Redirect to campaign details after brief delay
            setTimeout(() => {
              router.push(`/campaign/${response.campaign_id}`);
            }, 1500);
          } else if (data.event === 'error') {
            showToast('error', data.data.message || 'An error occurred');
            eventSource.close();
            setIsProcessing(false);
          }
        } catch (e) {
          console.log(' Error parsing SSE data:', e);
        }
      };

      eventSource.onerror = () => {
        showToast('error', 'Connection lost. Please check your backend.');
        eventSource.close();
        setIsProcessing(false);
      };
    } catch (error) {
      console.log(' Error creating campaign:', error);
      showToast('error', 'Failed to create campaign. Is the backend running?');
      setIsProcessing(false);
    }
  }, [inputMode, inputText, inputUrl, selectedFile, router, showToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create New Campaign</h1>
          <p className="text-[#b0b0b0]">
            Enter your product description and our AI agents will generate coordinated content.
          </p>
        </div>

        {/* Input Section */}
        <div className="rounded-lg border border-[#1F2022] p-6 mb-8">
          {/* Input Mode Tabs */}
          <div className="flex gap-2 mb-6 border-b border-[#3a3a3a]">
            <button
              onClick={() => setInputMode('text')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                inputMode === 'text'
                  ? 'text-white border-b-2 border-white'
                  : 'text-[#808080] hover:text-white'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setInputMode('file')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                inputMode === 'file'
                  ? 'text-white border-b-2 border-white'
                  : 'text-[#808080] hover:text-white'
              }`}
            >
              File
            </button>
            <button
              onClick={() => setInputMode('url')}
              className={`px-4 py-3 text-sm font-medium transition-all ${
                inputMode === 'url'
                  ? 'text-white border-b-2 border-white'
                  : 'text-[#808080] hover:text-white'
              }`}
            >
              URL
            </button>
          </div>

          {/* Text Input */}
          {inputMode === 'text' && (
            <>
              <label className="block text-sm font-medium text-white mb-2">
                Product Description
              </label>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isProcessing}
                placeholder="Enter your product description here. Include key features, benefits, target audience, and unique selling points..."
                className="w-full h-48 bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-[#808080] resize-none focus:outline-none focus:border-[#00d4ff] transition-colors disabled:opacity-50"
              />
              <div className="flex items-end justify-between mt-4">
                <span className="text-xs text-[#808080]">
                  {inputText.length} characters
                </span>
              </div>
            </>
          )}

          {/* File Input */}
          {inputMode === 'file' && (
            <>
              <label className="block text-sm font-medium text-white mb-3">
                Upload Document
              </label>
              <div className="flex flex-col gap-4">
                <div className="border-2 border-dashed border-[#3a3a3a] rounded-lg p-8 text-center">
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    disabled={isProcessing}
                    className="w-full"
                  />
                  {selectedFile && (
                    <p className="text-sm text-[#00d4ff] mt-3">
                      ✓ {selectedFile.name}
                    </p>
                  )}
                  <p className="text-xs text-[#808080] mt-3">
                    Supports: TXT, PDF, DOC, DOCX
                  </p>
                </div>
              </div>
            </>
          )}

          {/* URL Input */}
          {inputMode === 'url' && (
            <>
              <label className="block text-sm font-medium text-white mb-2">
                Website URL
              </label>
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                disabled={isProcessing}
                placeholder="https://example.com/article"
                className="w-full bg-[#1a1a1a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-[#808080] focus:outline-none focus:border-[#00d4ff] transition-colors disabled:opacity-50"
              />
              <p className="text-xs text-[#808080] mt-3">
                We'll extract and analyze content from the provided URL
              </p>
            </>
          )}

          {/* Submit Button */}
          <div className="flex gap-3 mt-6">
            <GradientButton
              variant="secondary"
              onClick={handleSubmit}
              disabled={isProcessing || (inputMode === 'text' && !inputText.trim()) || (inputMode === 'file' && !selectedFile) || (inputMode === 'url' && !inputUrl.trim())}
              isLoading={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Generate & Watch'}
            </GradientButton>
          </div>
        </div>

        {/* Live Agent Room */}
        {isProcessing && (
          <div className="bg-[#252525] rounded-lg border border-[#3a3a3a] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Live Agent Room</h2>
                {campaignId && (
                  <p className="text-sm text-[#808080]">
                    Campaign ID: <code className="text-[#00d4ff] font-mono">{campaignId}</code>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#06ffa5] animate-pulse" />
                <span className="text-sm text-[#06ffa5]">Live</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#b0b0b0]">Overall Progress</span>
                <span className="text-sm text-[#00d4ff]">{progress}%</span>
              </div>
              <ProgressBar value={progress} variant="cyan" />
            </div>

            {/* Agent Timeline */}
            <AgentTimeline messages={messages} />
          </div>
        )}

        {/* Tips Section */}
        {!isProcessing && (
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a]">
              <div className="w-10 h-10 rounded-lg bg-[#11BDF7] flex items-center justify-center mb-3">
                <FaInfo className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">Be Detailed</h3>
              <p className="text-xs text-[#808080]">Include product features, benefits, and unique selling points.</p>
            </div>
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a]">
              <div className="w-10 h-10 rounded-lg bg-[#FFA7A7] text-white flex items-center justify-center mb-3">
                <LuTarget className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">Target Audience</h3>
              <p className="text-xs text-[#808080]">Mention who your product is for to get better content.</p>
            </div>
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a]">
              <div className="w-10 h-10 rounded-lg bg-[#FAD161] text-white flex items-center justify-center mb-3">
                <FaStar className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">Tone & Style</h3>
              <p className="text-xs text-[#808080]">Specify if you want professional, casual, or playful content.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewCampaignPage() {
  return (
    <ToastProvider>
      <NewCampaignContent />
    </ToastProvider>
  );
}
