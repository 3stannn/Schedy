import React, { forwardRef } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

export type MovingAnimation =
  | 'swing'
  | 'wiggle'
  | 'bounce'
  | 'spin'
  | 'pulse'
  | 'pop'
  | 'success'
  | 'nudge'
  | 'shake'
  | 'none';

export interface MovingIconProps extends LucideProps {
  animation?: MovingAnimation;
  animate?: boolean;
}

// Map each icon to its movingicons.dev micro-motion preset
const ICON_ANIMATION_MAP: Record<string, MovingAnimation> = {
  // Swing / Bell / Pendulum
  Bell: 'swing',
  Moon: 'swing',
  Pin: 'swing',
  Volume2: 'swing',
  VolumeX: 'swing',

  // Wiggle / Tool actions
  Trash: 'wiggle',
  Trash2: 'wiggle',
  Edit: 'wiggle',
  Edit3: 'wiggle',
  Megaphone: 'wiggle',

  // Bounce / Directional drop
  Download: 'bounce',
  Upload: 'bounce',
  MapPin: 'bounce',

  // Spin / Rotation
  RefreshCw: 'spin',
  RotateCcw: 'spin',
  Settings: 'spin',
  Sun: 'spin',
  Undo: 'spin',
  Redo: 'spin',
  SlidersHorizontal: 'spin',

  // Pulse / Heartbeat / Glow
  Sparkles: 'pulse',
  Clock: 'pulse',
  Timer: 'pulse',
  Database: 'pulse',
  Brain: 'pulse',
  Flame: 'pulse',
  Coffee: 'pulse',
  Flower2: 'pulse',
  Server: 'pulse',
  Heart: 'pulse',

  // Pop / Quick tactile response
  Plus: 'pop',
  X: 'pop',
  Eye: 'pop',
  EyeOff: 'pop',
  Share2: 'pop',
  Play: 'pop',
  Pause: 'pop',
  SkipForward: 'pop',
  Maximize2: 'pop',
  Minimize2: 'pop',
  Target: 'pop',
  Headphones: 'pop',
  Copy: 'pop',
  Key: 'pop',
  Menu: 'pop',
  Square: 'pop',

  // Success / Checkmarks
  Check: 'success',
  CheckCircle2: 'success',
  CheckSquare: 'success',

  // Nudge / Navigation / Search
  Search: 'nudge',
  Calendar: 'nudge',
  ChevronLeft: 'nudge',
  ChevronRight: 'nudge',
  ArrowLeft: 'nudge',
  ArrowRight: 'nudge',
  ExternalLink: 'nudge',

  // Shake / Security / Warnings
  Lock: 'shake',
  AlertTriangle: 'shake',
  AlertCircle: 'shake',
  Info: 'shake',

  // Formatting / Content
  FileText: 'pop',
  FileSpreadsheet: 'pop',
  FileJson: 'pop',
  Layers: 'pop',
  Tag: 'pop',
  Repeat: 'spin',
  Video: 'pop',
  User: 'pop',
  BookOpen: 'pop',
  Bold: 'pop',
  Italic: 'pop',
  Underline: 'pop',
  Strikethrough: 'pop',
  Highlighter: 'pop',
  Heading1: 'pop',
  Heading2: 'pop',
  Heading3: 'pop',
  List: 'nudge',
  ListOrdered: 'nudge',
  Quote: 'pop',
  Code: 'pop',
  Minus: 'pop',
  HelpCircle: 'pulse',
};

/**
 * Creates an animated Moving Icon component adhering to movingicons.dev motion dynamics.
 */
export function createMovingIcon(name: string, defaultAnimation?: MovingAnimation) {
  const LucideComponent = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
  const anim = defaultAnimation || ICON_ANIMATION_MAP[name] || 'pop';

  const MovingIconComponent = forwardRef<SVGSVGElement, MovingIconProps>((props, ref) => {
    const {
      animation = anim,
      animate = false,
      className = '',
      ...rest
    } = props;

    if (!LucideComponent) {
      return null;
    }

    const animClass = animation !== 'none' ? `moving-icon-${animation}` : '';
    const alwaysClass = animate ? 'moving-icon-always' : '';
    const combinedClass = `moving-icon ${animClass} ${alwaysClass} ${className}`.trim();

    return <LucideComponent ref={ref} {...rest} className={combinedClass} />;
  });

  MovingIconComponent.displayName = `MovingIcon(${name})`;
  return MovingIconComponent;
}

/**
 * Generic MovingIcon component allowing dynamic icon selection with motion presets.
 */
export const MovingIcon = forwardRef<SVGSVGElement, MovingIconProps & { name: string }>(
  ({ name, animation, animate, className = '', ...rest }, ref) => {
    const LucideComponent = (LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>)[name];
    if (!LucideComponent) return null;

    const anim = animation || ICON_ANIMATION_MAP[name] || 'pop';
    const animClass = anim !== 'none' ? `moving-icon-${anim}` : '';
    const alwaysClass = animate ? 'moving-icon-always' : '';
    const combinedClass = `moving-icon ${animClass} ${alwaysClass} ${className}`.trim();

    return <LucideComponent ref={ref} {...rest} className={combinedClass} />;
  }
);
MovingIcon.displayName = 'MovingIcon';

// Pre-defined Moving Icons for all app components (100% typed drop-in replacements)
export const Calendar = createMovingIcon('Calendar', 'nudge');
export const Clock = createMovingIcon('Clock', 'pulse');
export const Timer = createMovingIcon('Timer', 'pulse');
export const Plus = createMovingIcon('Plus', 'pop');
export const X = createMovingIcon('X', 'pop');
export const Search = createMovingIcon('Search', 'nudge');
export const Trash2 = createMovingIcon('Trash2', 'wiggle');
export const Trash = createMovingIcon('Trash', 'wiggle');
export const Edit3 = createMovingIcon('Edit3', 'wiggle');
export const Edit = createMovingIcon('Edit', 'wiggle');
export const Pin = createMovingIcon('Pin', 'swing');
export const Bell = createMovingIcon('Bell', 'swing');
export const Megaphone = createMovingIcon('Megaphone', 'wiggle');
export const Check = createMovingIcon('Check', 'success');
export const CheckSquare = createMovingIcon('CheckSquare', 'success');
export const CheckCircle2 = createMovingIcon('CheckCircle2', 'success');
export const Square = createMovingIcon('Square', 'pop');
export const AlertTriangle = createMovingIcon('AlertTriangle', 'shake');
export const AlertCircle = createMovingIcon('AlertCircle', 'shake');
export const Info = createMovingIcon('Info', 'shake');
export const Sparkles = createMovingIcon('Sparkles', 'pulse');
export const Download = createMovingIcon('Download', 'bounce');
export const Upload = createMovingIcon('Upload', 'bounce');
export const Share2 = createMovingIcon('Share2', 'pop');
export const Copy = createMovingIcon('Copy', 'pop');
export const Link = createMovingIcon('Link', 'pop');
export const ExternalLink = createMovingIcon('ExternalLink', 'nudge');
export const RefreshCw = createMovingIcon('RefreshCw', 'spin');
export const RotateCcw = createMovingIcon('RotateCcw', 'spin');
export const Undo = createMovingIcon('Undo', 'spin');
export const Redo = createMovingIcon('Redo', 'spin');
export const Settings = createMovingIcon('Settings', 'spin');
export const SlidersHorizontal = createMovingIcon('SlidersHorizontal', 'spin');
export const Sun = createMovingIcon('Sun', 'spin');
export const Moon = createMovingIcon('Moon', 'swing');
export const Flower2 = createMovingIcon('Flower2', 'pulse');
export const Database = createMovingIcon('Database', 'pulse');
export const Server = createMovingIcon('Server', 'pulse');
export const Key = createMovingIcon('Key', 'pop');
export const Lock = createMovingIcon('Lock', 'shake');
export const Eye = createMovingIcon('Eye', 'pop');
export const EyeOff = createMovingIcon('EyeOff', 'pop');
export const MapPin = createMovingIcon('MapPin', 'bounce');
export const Video = createMovingIcon('Video', 'pop');
export const Repeat = createMovingIcon('Repeat', 'spin');
export const Layers = createMovingIcon('Layers', 'pop');
export const Tag = createMovingIcon('Tag', 'pop');
export const User = createMovingIcon('User', 'pop');
export const BookOpen = createMovingIcon('BookOpen', 'pop');
export const Menu = createMovingIcon('Menu', 'pop');
export const FileText = createMovingIcon('FileText', 'pop');
export const FileSpreadsheet = createMovingIcon('FileSpreadsheet', 'pop');
export const FileJson = createMovingIcon('FileJson', 'pop');
export const ChevronLeft = createMovingIcon('ChevronLeft', 'nudge');
export const ChevronRight = createMovingIcon('ChevronRight', 'nudge');
export const ArrowLeft = createMovingIcon('ArrowLeft', 'nudge');
export const ArrowRight = createMovingIcon('ArrowRight', 'nudge');
export const Play = createMovingIcon('Play', 'pop');
export const Pause = createMovingIcon('Pause', 'pop');
export const SkipForward = createMovingIcon('SkipForward', 'pop');
export const Volume2 = createMovingIcon('Volume2', 'swing');
export const VolumeX = createMovingIcon('VolumeX', 'swing');
export const Flame = createMovingIcon('Flame', 'pulse');
export const Coffee = createMovingIcon('Coffee', 'pulse');
export const Brain = createMovingIcon('Brain', 'pulse');
export const Target = createMovingIcon('Target', 'pop');
export const Headphones = createMovingIcon('Headphones', 'pop');
export const Maximize2 = createMovingIcon('Maximize2', 'pop');
export const Minimize2 = createMovingIcon('Minimize2', 'pop');
export const Bold = createMovingIcon('Bold', 'pop');
export const Italic = createMovingIcon('Italic', 'pop');
export const Underline = createMovingIcon('Underline', 'pop');
export const Strikethrough = createMovingIcon('Strikethrough', 'pop');
export const Highlighter = createMovingIcon('Highlighter', 'pop');
export const Heading1 = createMovingIcon('Heading1', 'pop');
export const Heading2 = createMovingIcon('Heading2', 'pop');
export const Heading3 = createMovingIcon('Heading3', 'pop');
export const List = createMovingIcon('List', 'nudge');
export const ListOrdered = createMovingIcon('ListOrdered', 'nudge');
export const Quote = createMovingIcon('Quote', 'pop');
export const Code = createMovingIcon('Code', 'pop');
export const Minus = createMovingIcon('Minus', 'pop');
export const HelpCircle = createMovingIcon('HelpCircle', 'pulse');
