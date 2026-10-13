import { Brain, Sparkles, Zap } from 'lucide-react';

const MARKS = {
  claude: {
    label: 'Claude',
    Icon: Brain,
    wrap: 'bg-[#cc785c]/15 text-[#b65c3d]',
    ring: 'ring-[#cc785c]/25'
  },
  groq: {
    label: 'Groq',
    Icon: Zap,
    wrap: 'bg-orange-500/15 text-orange-600',
    ring: 'ring-orange-500/25'
  },
  gemini: {
    label: 'Gemini',
    Icon: Sparkles,
    wrap: 'bg-blue-500/15 text-blue-600',
    ring: 'ring-blue-500/25'
  }
};

export function AiProviderMark({ id, size = 'md' }) {
  const mark = MARKS[id] || MARKS.gemini;
  const Icon = mark.Icon;
  const box = size === 'lg' ? 'h-12 w-12' : 'h-11 w-11';
  const icon = size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
  return (
    <span className={`grid ${box} place-items-center rounded-2xl ring-1 ${mark.wrap} ${mark.ring}`}>
      <Icon className={icon} strokeWidth={2} />
    </span>
  );
}
