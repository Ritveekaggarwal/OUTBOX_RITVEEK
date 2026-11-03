import { useState } from 'react';
import clsx from 'clsx';
import { initials } from '../../utils/format';

const PALETTE = ['bg-brand-600', 'bg-[#6366F1]', 'bg-[#F59E0B]', 'bg-[#EC4899]', 'bg-[#0EA5E9]', 'bg-[#8B5CF6]'];

const colorFor = (seed: string) =>
  PALETTE[[...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0) % PALETTE.length];

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, src, size = 32, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.4) };

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={clsx('shrink-0 rounded-full object-cover', className)}
      />
    );
  }

  return (
    <span
      style={style}
      aria-label={name}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        colorFor(name),
        className,
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}
