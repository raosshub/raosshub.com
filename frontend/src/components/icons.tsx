// ═══════════════════════════════════════════════════════════════
// RAOSS Hub v3 — SVG Icon Components
// Ported from v2 BUILT_IN_ICONS map
// ═══════════════════════════════════════════════════════════════

import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const svgBase = (content: React.ReactNode, size = 18, cls = '', style?: React.CSSProperties) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={cls}
    style={{ flexShrink: 0, ...style }}
  >
    {content}
  </svg>
);

export const Icons = {
  overview:    ({ size, className, style }: IconProps) => svgBase(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></>, size, className, style),
  react:       ({ size, className, style }: IconProps) => svgBase(<><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></>, size, className, style),
  pcba:        ({ size, className, style }: IconProps) => svgBase(<><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></>, size, className, style),
  firmware:    ({ size, className, style }: IconProps) => svgBase(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.67 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.67 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.67a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>, size, className, style),
  tft:         ({ size, className, style }: IconProps) => svgBase(<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>, size, className, style),
  router:      ({ size, className, style }: IconProps) => svgBase(<><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></>, size, className, style),
  charger:     ({ size, className, style }: IconProps) => svgBase(<><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><path d="M6 7v10"/></>, size, className, style),
  shell:       ({ size, className, style }: IconProps) => svgBase(<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></>, size, className, style),
  settings:    ({ size, className, style }: IconProps) => svgBase(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.67 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.67 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.67a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></>, size, className, style),
  logout:      ({ size, className, style }: IconProps) => svgBase(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>, size, className, style),
  robot:       ({ size, className, style }: IconProps) => svgBase(<><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7"/><circle cx="9" cy="17" r="1"/><circle cx="15" cy="17" r="1"/></>, size, className, style),
  sparkles:    ({ size, className, style }: IconProps) => svgBase(<><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M5 20l1-3 3 1-1 3z"/></>, size, className, style),
  globe:       ({ size, className, style }: IconProps) => svgBase(<><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></>, size, className, style),
  check:       ({ size, className, style }: IconProps) => svgBase(<polyline points="20 6 9 17 4 12"/>, size, className, style),
  upload:      ({ size, className, style }: IconProps) => svgBase(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>, size, className, style),
  download:    ({ size, className, style }: IconProps) => svgBase(<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>, size, className, style),
  document:    ({ size, className, style }: IconProps) => svgBase(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>, size, className, style),
  folder:      ({ size, className, style }: IconProps) => svgBase(<><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></>, size, className, style),
  bell:        ({ size, className, style }: IconProps) => svgBase(<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>, size, className, style),
  calendar:    ({ size, className, style }: IconProps) => svgBase(<><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>, size, className, style),
  users:       ({ size, className, style }: IconProps) => svgBase(<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>, size, className, style),
  clock:       ({ size, className, style }: IconProps) => svgBase(<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>, size, className, style),
  sun:         ({ size, className, style }: IconProps) => svgBase(<><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>, size, className, style),
  moon:        ({ size, className, style }: IconProps) => svgBase(<><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>, size, className, style),
  chat:        ({ size, className, style }: IconProps) => svgBase(<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>, size, className, style),
  music:       ({ size, className, style }: IconProps) => svgBase(<><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>, size, className, style),
  zap:         ({ size, className, style }: IconProps) => svgBase(<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>, size, className, style),
  battery:     ({ size, className, style }: IconProps) => svgBase(<><rect x="2" y="7" width="16" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/></>, size, className, style),
  image:       ({ size, className, style }: IconProps) => svgBase(<><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></>, size, className, style),
  warning:     ({ size, className, style }: IconProps) => svgBase(<><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>, size, className, style),
  cube:        ({ size, className, style }: IconProps) => svgBase(<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>, size, className, style),
  send:        ({ size, className, style }: IconProps) => svgBase(<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>, size, className, style),
  trash:       ({ size, className, style }: IconProps) => svgBase(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>, size, className, style),
  pencil:      ({ size, className, style }: IconProps) => svgBase(<><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></>, size, className, style),
  plus:        ({ size, className, style }: IconProps) => svgBase(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>, size, className, style),
  target:      ({ size, className, style }: IconProps) => svgBase(<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>, size, className, style),
  close:       ({ size, className, style }: IconProps) => svgBase(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>, size, className, style),
  save:        ({ size, className, style }: IconProps) => svgBase(<><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></>, size, className, style),
  checkCircle: ({ size, className, style }: IconProps) => svgBase(<><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>, size, className, style),
  info:        ({ size, className, style }: IconProps) => svgBase(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>, size, className, style),
  pin:         ({ size, className, style }: IconProps) => svgBase(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>, size, className, style),
  eye:         ({ size, className, style }: IconProps) => svgBase(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>, size, className, style),
  eyeOff:      ({ size, className, style }: IconProps) => svgBase(<><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>, size, className, style),
  clipboard:   ({ size, className, style }: IconProps) => svgBase(<><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>, size, className, style),
  cpu:         ({ size, className, style }: IconProps) => svgBase(<><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></>, size, className, style),
  layers:      ({ size, className, style }: IconProps) => svgBase(<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>, size, className, style),
  code:        ({ size, className, style }: IconProps) => svgBase(<><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></>, size, className, style),
  wifi:        ({ size, className, style }: IconProps) => svgBase(<><path d="M5 12.55a11 11 0 0114.08 0M1.42 9a16 16 0 0121.16 0M8.53 16.11a6 6 0 016.95 0M12 20h.01"/></>, size, className, style),
  bluetooth:   ({ size, className, style }: IconProps) => svgBase(<><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"/></>, size, className, style),
  shield:      ({ size, className, style }: IconProps) => svgBase(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>, size, className, style),
  package:     ({ size, className, style }: IconProps) => svgBase(<><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>, size, className, style),
  tool:        ({ size, className, style }: IconProps) => svgBase(<><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></>, size, className, style),
  server:      ({ size, className, style }: IconProps) => svgBase(<><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></>, size, className, style),
  monitor:     ({ size, className, style }: IconProps) => svgBase(<><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></>, size, className, style),
  speaker:     ({ size, className, style }: IconProps) => svgBase(<><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><line x1="12" y1="6" x2="12.01" y2="6"/></>, size, className, style),
  camera:      ({ size, className, style }: IconProps) => svgBase(<><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></>, size, className, style),
  power:       ({ size, className, style }: IconProps) => svgBase(<><path d="M18.36 6.64a9 9 0 11-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></>, size, className, style),
  antenna:     ({ size, className, style }: IconProps) => svgBase(<><path d="M2 16.1A5 5 0 015.9 20M2 12.05A9 9 0 019.95 20M2 8V6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2h-6"/><line x1="2" y1="20" x2="2.01" y2="20"/></>, size, className, style),
  usb:         ({ size, className, style }: IconProps) => svgBase(<><circle cx="10" cy="7" r="1"/><circle cx="14" cy="7" r="1"/><path d="M12 7v10"/><path d="M8 17h8"/><path d="M12 3v4"/><circle cx="12" cy="3" r="1"/></>, size, className, style),
  database:    ({ size, className, style }: IconProps) => svgBase(<><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></>, size, className, style),
  microphone:  ({ size, className, style }: IconProps) => svgBase(<><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>, size, className, style),
  sensor:      ({ size, className, style }: IconProps) => svgBase(<><path d="M12 22V12"/><path d="M5 9A7 7 0 0119 9"/><path d="M3 6a10 10 0 0118 0"/><circle cx="12" cy="12" r="1"/></>, size, className, style),
  box:         ({ size, className, style }: IconProps) => svgBase(<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></>, size, className, style),
  link:        ({ size, className, style }: IconProps) => svgBase(<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>, size, className, style),
  menu:        ({ size, className, style }: IconProps) => svgBase(<><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>, size, className, style),
  search:      ({ size, className, style }: IconProps) => svgBase(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>, size, className, style),
  chevronDown: ({ size, className, style }: IconProps) => svgBase(<polyline points="6 9 12 15 18 9"/>, size, className, style),
  chevronLeft: ({ size, className, style }: IconProps) => svgBase(<polyline points="15 18 9 12 15 6"/>, size, className, style),
  chevronRight:({ size, className, style }: IconProps) => svgBase(<polyline points="9 18 15 12 9 6"/>, size, className, style),
  hand:        ({ size, className, style }: IconProps) => svgBase(<><path d="M18 11V6a2 2 0 00-2-2v0a2 2 0 00-2 2v0"/><path d="M14 10V4a2 2 0 00-2-2v0a2 2 0 00-2 2v2"/><path d="M10 10.5V6a2 2 0 00-2-2v0a2 2 0 00-2 2v8"/><path d="M18 8a2 2 0 012 2v4a6 6 0 01-6 6h-2c-2 0-4-1-6-3l-2.5-2.5"/></>, size, className, style),
};

export type IconName = keyof typeof Icons;
