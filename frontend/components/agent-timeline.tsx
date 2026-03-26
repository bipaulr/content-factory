'use client';

import { cn } from '@/lib/utils';
import type { AgentMessage, AgentType } from '@/lib/types';

interface AgentTimelineProps {
  messages: AgentMessage[];
  className?: string;
}

const agentConfig: Record<AgentType, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  researcher: {
    icon: '🔬',
    color: 'text-[#00d4ff]',
    bgColor: 'bg-[#00d4ff]/10',
    borderColor: 'border-[#00d4ff]/30',
  },
  copywriter: {
    icon: '📝',
    color: 'text-[#ff8c42]',
    bgColor: 'bg-[#ff8c42]/10',
    borderColor: 'border-[#ff8c42]/30',
  },
  editor: {
    icon: '👨‍⚖️',
    color: 'text-[#ff006e]',
    bgColor: 'bg-[#ff006e]/10',
    borderColor: 'border-[#ff006e]/30',
  },
  system: {
    icon: '⚙️',
    color: 'text-[#808080]',
    bgColor: 'bg-[#808080]/10',
    borderColor: 'border-[#808080]/30',
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
              "flex gap-4 p-4 rounded-lg border transition-all duration-300",
              config.bgColor,
              config.borderColor
            )}
          >
            {/* Agent Icon */}
            <div className="flex-shrink-0">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                config.bgColor,
                "border",
                config.borderColor
              )}>
                {config.icon}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn("font-medium capitalize", config.color)}>
                  {message.agent}
                </span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  statusIndicator[message.status]
                )} />
                <span className="text-xs text-[#808080]">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <p className="text-[#b0b0b0] text-sm">{message.message}</p>
              {message.details && (
                <p className="text-xs text-[#808080] mt-2 font-mono bg-[#1a1a1a] p-2 rounded">
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
