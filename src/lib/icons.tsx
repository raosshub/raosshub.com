import React from "react";
import {
  LayoutGrid, Smartphone, Cpu, Settings, Globe, Check, Upload, Download,
  FileText, Folder, Bell, Calendar, Users, Clock, Sun, Moon, MessageSquare,
  Music, Zap, Battery, Hand, Image, AlertTriangle, Box, Database, Camera,
  Code, Layers, Shield, Package, Power, Usb, Monitor, Lock, Unlock, Search,
  Trash2, Edit3, Wifi, BatteryCharging, HardDrive, Sparkles, Router,
  Send, Mail, FileCode, X, Plus, ChevronRight, Eye, EyeOff, Loader2,
  type LucideIcon,
} from "lucide-react";

const BUILT_IN_ICONS: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  react: Smartphone,
  pcba: Cpu,
  firmware: Settings,
  tft: Monitor,
  router: Wifi,
  charger: BatteryCharging,
  shell: Box,
  settings: Settings,
  robot: Sparkles,
  sparkles: Sparkles,
  globe: Globe,
  check: Check,
  upload: Upload,
  download: Download,
  document: FileText,
  folder: Folder,
  bell: Bell,
  calendar: Calendar,
  users: Users,
  clock: Clock,
  sun: Sun,
  moon: Moon,
  chat: MessageSquare,
  music: Music,
  zap: Zap,
  battery: Battery,
  hand: Hand,
  image: Image,
  warning: AlertTriangle,
  cube: Box,
  send: Send,
  mail: Mail,
  box: Box,
  cpu: Cpu,
  database: Database,
  camera: Camera,
  code: Code,
  layers: Layers,
  shield: Shield,
  package: Package,
  power: Power,
  usb: Usb,
  monitor: Monitor,
  file: FileText,
  lock: Lock,
  unlock: Unlock,
  search: Search,
  trash: Trash2,
  edit: Edit3,
};

interface IconSvgProps {
  name: string;
  size?: number;
  className?: string;
  svg?: string;
}

export function IconSvg({ name, size = 16, className = "", svg }: IconSvgProps) {
  // If custom SVG provided, render it
  if (svg) {
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: svg }}
        style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      />
    );
  }

  const LucideIcon = BUILT_IN_ICONS[name];
  if (!LucideIcon) {
    // Fallback to Box icon
    return <Box size={size} className={className} style={{ color: "inherit" }} />;
  }

  return <LucideIcon size={size} className={className} style={{ color: "inherit" }} />;
}
