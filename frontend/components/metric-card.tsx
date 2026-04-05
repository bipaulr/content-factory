import { cn } from '@/lib/utils';

type MetricVariant = 'cyan' | 'green' | 'pink' | 'yellow' | 'orange' | 'purple' | 'blue';

interface MetricCardProps {
  label: string;
  value: string | number;
  variant?: MetricVariant;
  icon?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<MetricVariant, { bg: string; border: string; text: string }> = {
  cyan: {
    bg: 'bg-[#0EBEF2]',
    border: '',
    text: 'text-black font-bold',
  },
  green: {
    bg: 'bg-[#06ffa5] opacity-90',
    border: 'border-[#06ffa5]/30',
    text: 'text-black font-bold',
  },
  pink: {
    bg: 'bg-[#FFA9A8]',
    border: '',
    text: 'text-black font-bold',
  },
  yellow: {
    bg: 'bg-[#F6D25E]',
    border: 'border-[#ffd60a]/30',
    text: 'text-black font-bold',
  },
  orange: {
    bg: 'bg-gradient-to-br from-[#ff8c42]/20 to-[#ff8c42]/5',
    border: 'border-[#ff8c42]/30',
    text: 'text-[#ff8c42]',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#8338ec]/20 to-[#8338ec]/5',
    border: 'border-[#8338ec]/30',
    text: 'text-[#8338ec]',
  },
  blue: {
    bg: 'bg-gradient-to-br from-[#3a86ff]/20 to-[#3a86ff]/5',
    border: 'border-[#3a86ff]/30',
    text: 'text-[#3a86ff]',
  },
};

export function MetricCard({ label, value, variant = 'cyan', icon, className }: MetricCardProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "p-6 border transition-all duration-300 hover:scale-[1.02]",
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-black font-bold mb-1">{label}</p>
          <p className={cn("text-3xl font-bold", styles.text)}>{value}</p>
        </div>
        {icon && (
          <div className={cn("p-2", styles.bg, styles.text)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
