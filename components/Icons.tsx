import React from 'react';
import { PATHS, IconName } from '@/lib/constants';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  sw?: number;
}

export const Icon: React.FC<IconProps> = ({ name, size = 24, color = "currentColor", sw = 1.8 }) => {
  const d = PATHS[name];
  if (!d) return <svg width={size} height={size} viewBox="0 0 24 24" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
};
