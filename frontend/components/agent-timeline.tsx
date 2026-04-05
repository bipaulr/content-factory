'use client';

import { cn } from '@/lib/utils';
import { BsEyeglasses } from 'react-icons/bs';
import { LuPencil, LuMicroscope, LuCog } from 'react-icons/lu';
import type { AgentMessage, AgentType } from '@/lib/types';

interface AgentTimelineProps {
  messages: AgentMessage[];
  className?: string;
}

const agentConfig: Record<AgentType, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  researcher: {
    icon: '🔬',
    color: 'text-black',
    bgColor: 'bg-[#00d4ff]',
    borderColor: 'border-[#00d4ff]',
  },
  copywriter: {
    icon: '📝',
    color: 'text-black',
    bgColor: 'bg-[#06ffa5]',
    borderColor: 'border-[#06ffa5]',
  },
  editor: {
    icon: '👨‍⚖️',
    color: 'text-black',
    bgColor: 'bg-[#ffd60a]',
    borderColor: 'border-[#ffd60a]',
  },
  system: {
    icon: '⚙️',
    color: 'text-white',
    bgColor: 'bg-[#808080]/20',
    borderColor: 'border-[#808080]/50',
  },
};

const statusIndicator: Record<AgentMessage['status'], string> = {
  pending: 'bg-[#808080]',
  processing: 'bg-[#ffd60a] animate-pulse',
  completed: 'bg-[#06ffa5]',
  error: 'bg-[#ff006e]',
};

export function AgentTimeline({ messages, className }: AgentTimelineProps) {
  if (messages.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-[#808080]">Waiting for agent activity...</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {messages.map((message) => {
        const config = agentConfig[message.agent];
        
        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-4 p-4 border transition-all duration-300 bg-[#0a0a0a]",
              config.borderColor
            )}
          >
            {/* Agent Icon */}
            <div className="flex-shrink-0 flex items-center justify-center text-xl">
              {message.agent === 'editor' ? (
                <BsEyeglasses className="text-[#ffd60a]" size={20} />
              ) : message.agent === 'copywriter' ? (
                <LuPencil className="text-[#06ffa5]" size={20} />
              ) : message.agent === 'researcher' ? (
                <LuMicroscope className="text-[#00d4ff]" size={20} />
              ) : message.agent === 'system' ? (
                <LuCog className="text-[#e5dff0]" size={20} />
              ) : (
                config.icon
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium capitalize text-white">
                  {message.agent}
                </span>
                <div className={cn(
                  "w-2 h-2",
                  statusIndicator[message.status]
                )} />
                <span className={cn(
                  "text-xs",
                  message.agent === 'system' ? "text-[#808080]" : "text-[#b0b0b0]"
                )}>
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-white">{message.message}</p>
              {message.details && (
                <p className="text-xs text-[#808080] mt-2 font-mono bg-[#1a1a1a] p-2">
                  {message.details}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
