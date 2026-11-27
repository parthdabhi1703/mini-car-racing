import React from 'react';

const baseProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export function SpeakerOnIcon({ size = 19 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function SpeakerOffIcon({ size = 19 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

export function PauseIcon({ size = 18 }) {
  return (
    <svg {...baseProps} width={size} height={size} fill="currentColor" stroke="none">
      <rect x="6" y="4" width="4.5" height="16" rx="1.2" />
      <rect x="13.5" y="4" width="4.5" height="16" rx="1.2" />
    </svg>
  );
}

export function PlayIcon({ size = 18 }) {
  return (
    <svg {...baseProps} width={size} height={size} fill="currentColor" stroke="none">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  );
}

export function FullscreenEnterIcon({ size = 18 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <polyline points="21 15 21 21 15 21" />
      <polyline points="3 9 3 3 9 3" />
    </svg>
  );
}

export function FullscreenExitIcon({ size = 18 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <polyline points="14 20 14 14 20 14" />
      <polyline points="10 4 10 10 4 10" />
    </svg>
  );
}

export function DownloadIcon({ size = 17 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export function GyroIcon({ size = 18 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
      <path d="M3 9c-.7 2-.7 4 0 6" />
      <path d="M21 9c.7 2 .7 4 0 6" />
    </svg>
  );
}

export function TouchIcon({ size = 18 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.5L3.3 16a2 2 0 0 1 2.8-2.8L8 15" />
    </svg>
  );
}

export function TargetIcon({ size = 15 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 26 }) {
  return (
    <svg {...baseProps} width={size} height={size} strokeWidth={2.6}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 26 }) {
  return (
    <svg {...baseProps} width={size} height={size} strokeWidth={2.6}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 26 }) {
  return (
    <svg {...baseProps} width={size} height={size} strokeWidth={2.6}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function BoltIcon({ size = 16 }) {
  return (
    <svg {...baseProps} width={size} height={size} fill="currentColor" stroke="none">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function OneWayIcon({ size = 16 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <line x1="8" y1="19" x2="8" y2="5" />
      <polyline points="4 9 8 5 12 9" />
      <line x1="16" y1="19" x2="16" y2="5" />
      <polyline points="12 9 16 5 20 9" />
    </svg>
  );
}

export function TwoWayIcon({ size = 16 }) {
  return (
    <svg {...baseProps} width={size} height={size}>
      <line x1="7" y1="19" x2="7" y2="5" />
      <polyline points="3.5 8.5 7 5 10.5 8.5" />
      <line x1="17" y1="5" x2="17" y2="19" />
      <polyline points="13.5 15.5 17 19 20.5 15.5" />
    </svg>
  );
}

export function HeartIcon({ size = 12 }) {
  return (
    <svg {...baseProps} width={size} height={size} fill="currentColor" stroke="none">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
