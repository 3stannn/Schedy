import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ScheduleEvent, EventStatus } from '../../types/schedule';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  Flame,
  Clock,
  Coffee,
  Brain,
  X,
  Target,
  Headphones,
  Maximize2,
  Minimize2,
  Timer
} from 'lucide-react';

export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroInfo {
  isRunning: boolean;
  timeLeft: number;
  mode: TimerMode;
  targetTaskTitle?: string;
}

interface PomodoroTimerProps {
  events?: ScheduleEvent[];
  onStatusChange?: (event: ScheduleEvent, status: EventStatus) => void;
  isActiveView?: boolean;
  onNavigateToPomodoro?: () => void;
  onTimerTick?: (info: PomodoroInfo) => void;
}

interface PomodoroSettings {
  focusDuration: number;      // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number;  // minutes
  longBreakInterval: number;  // every N focus sessions
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  ambientSound: 'none' | 'tick' | 'rain';
  volume: number;             // 0 to 1
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  ambientSound: 'none',
  volume: 0.8,
};

// Web Audio API Synthesizer for Chimes and Ambient Sounds
class AudioService {
  private ctx: AudioContext | null = null;
  private ambientNode: AudioNode | null = null;
  private ambientInterval: number | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play a soft, pleasant crystal bell chime
  playCompletionChime(volume: number = 0.8) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Chord frequencies for a calming completion tone (Fmaj9: F5, A5, C6, E6)
      const freqs = [698.46, 880.0, 1046.5, 1318.51];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        // Gentle envelope attack and decay
        gain.gain.setValueAtTime(0.0001, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.2 * volume, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 2.0);
      });
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  }

  // Start ambient sounds
  startAmbient(type: 'none' | 'tick' | 'rain', volume: number = 0.5) {
    this.stopAmbient();
    if (type === 'none') return;

    try {
      const ctx = this.getContext();

      if (type === 'tick') {
        // Subtle soft wooden click every second
        this.ambientInterval = window.setInterval(() => {
          try {
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, now);
            gain.gain.setValueAtTime(0.04 * volume, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.04);
          } catch {}
        }, 1000);
      } else if (type === 'rain') {
        // Synthesized pink noise generator for rain/white noise
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035 * volume;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.4 * volume, ctx.currentTime);

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoise.start();
        this.ambientNode = whiteNoise;
      }
    } catch (e) {
      console.warn('Ambient sound failed:', e);
    }
  }

  stopAmbient() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
    if (this.ambientNode) {
      try {
        (this.ambientNode as any).stop?.();
        this.ambientNode.disconnect();
      } catch {}
      this.ambientNode = null;
    }
  }
}

const audioService = new AudioService();

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  events = [],
  onStatusChange,
  isActiveView = true,
  onNavigateToPomodoro,
  onTimerTick,
}) => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<PomodoroSettings>(() => {
    try {
      const saved = localStorage.getItem('schedy_pomodoro_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Load persistent timer mode & state
  const [mode, setMode] = useState<TimerMode>(() => {
    try {
      const savedMode = localStorage.getItem('schedy_pomodoro_active_mode');
      if (savedMode === 'focus' || savedMode === 'shortBreak' || savedMode === 'longBreak') {
        return savedMode;
      }
    } catch {}
    return 'focus';
  });

  // Load initial time left (accounting for background time progression if it was running)
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    try {
      const targetEndTime = localStorage.getItem('schedy_pomodoro_end_timestamp');
      const isRunningSaved = localStorage.getItem('schedy_pomodoro_is_running') === 'true';

      if (isRunningSaved && targetEndTime) {
        const remaining = Math.round((parseInt(targetEndTime, 10) - Date.now()) / 1000);
        if (remaining > 0) return remaining;
      }

      const savedPaused = localStorage.getItem('schedy_pomodoro_paused_seconds');
      if (savedPaused) {
        return parseInt(savedPaused, 10);
      }
    } catch {}
    return settings.focusDuration * 60;
  });

  const [isRunning, setIsRunning] = useState<boolean>(() => {
    try {
      const targetEndTime = localStorage.getItem('schedy_pomodoro_end_timestamp');
      const isRunningSaved = localStorage.getItem('schedy_pomodoro_is_running') === 'true';
      if (isRunningSaved && targetEndTime) {
        return parseInt(targetEndTime, 10) > Date.now();
      }
    } catch {}
    return false;
  });

  const [completedSessionsToday, setCompletedSessionsToday] = useState<number>(() => {
    try {
      const key = `schedy_pomodoro_count_${new Date().toISOString().split('T')[0]}`;
      return parseInt(localStorage.getItem(key) || '0', 10);
    } catch {
      return 0;
    }
  });

  const [totalMinutesToday, setTotalMinutesToday] = useState<number>(() => {
    try {
      const key = `schedy_pomodoro_mins_${new Date().toISOString().split('T')[0]}`;
      return parseInt(localStorage.getItem(key) || '0', 10);
    } catch {
      return 0;
    }
  });

  const [sessionRound, setSessionRound] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('schedy_pomodoro_round') || '1', 10);
    } catch {
      return 1;
    }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    return localStorage.getItem('schedy_pomodoro_task_id') || '';
  });
  const [customGoal, setCustomGoal] = useState<string>(() => {
    return localStorage.getItem('schedy_pomodoro_custom_goal') || '';
  });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  // Save settings when modified
  const updateSettings = (newSettings: Partial<PomodoroSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('schedy_pomodoro_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Get total duration in seconds for current mode
  const getModeDurationSeconds = useCallback((m: TimerMode, s: PomodoroSettings) => {
    switch (m) {
      case 'shortBreak':
        return s.shortBreakDuration * 60;
      case 'longBreak':
        return s.longBreakDuration * 60;
      case 'focus':
      default:
        return s.focusDuration * 60;
    }
  }, []);

  // Mode Switcher handler
  const switchMode = useCallback((newMode: TimerMode, autoStart: boolean = false) => {
    setIsRunning(false);
    setMode(newMode);
    localStorage.setItem('schedy_pomodoro_active_mode', newMode);
    localStorage.removeItem('schedy_pomodoro_end_timestamp');
    localStorage.setItem('schedy_pomodoro_is_running', 'false');

    const dur = getModeDurationSeconds(newMode, settings);
    setTimeLeft(dur);
    localStorage.setItem('schedy_pomodoro_paused_seconds', dur.toString());

    if (autoStart) {
      setTimeout(() => {
        setIsRunning(true);
        localStorage.setItem('schedy_pomodoro_is_running', 'true');
        localStorage.setItem('schedy_pomodoro_end_timestamp', (Date.now() + dur * 1000).toString());
      }, 100);
    }
  }, [getModeDurationSeconds, settings]);

  // Handle Play/Pause
  const toggleRunning = () => {
    setIsRunning(prev => {
      const next = !prev;
      if (next) {
        const endTimestamp = Date.now() + timeLeft * 1000;
        localStorage.setItem('schedy_pomodoro_end_timestamp', endTimestamp.toString());
        localStorage.setItem('schedy_pomodoro_is_running', 'true');
        localStorage.removeItem('schedy_pomodoro_paused_seconds');
      } else {
        localStorage.removeItem('schedy_pomodoro_end_timestamp');
        localStorage.setItem('schedy_pomodoro_is_running', 'false');
        localStorage.setItem('schedy_pomodoro_paused_seconds', timeLeft.toString());
      }
      return next;
    });
  };

  // Persist task selection
  useEffect(() => {
    if (selectedTaskId) {
      localStorage.setItem('schedy_pomodoro_task_id', selectedTaskId);
    } else {
      localStorage.removeItem('schedy_pomodoro_task_id');
    }
  }, [selectedTaskId]);

  useEffect(() => {
    if (customGoal) {
      localStorage.setItem('schedy_pomodoro_custom_goal', customGoal);
    } else {
      localStorage.removeItem('schedy_pomodoro_custom_goal');
    }
  }, [customGoal]);

  // Request browser notifications permission on load
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Handle ambient sound playback on running state change
  useEffect(() => {
    if (isRunning && settings.ambientSound !== 'none') {
      audioService.startAmbient(settings.ambientSound, settings.volume);
    } else {
      audioService.stopAmbient();
    }
    return () => {
      audioService.stopAmbient();
    };
  }, [isRunning, settings.ambientSound, settings.volume]);

  // Selected task from Schedy tasks
  const pendingTasks = events.filter(e => e.status !== 'completed');
  const activeTask = events.find(e => e.id === selectedTaskId);

  // Notify parent of timer tick for global badge/mini widgets
  useEffect(() => {
    onTimerTick?.({
      isRunning,
      timeLeft,
      mode,
      targetTaskTitle: activeTask ? activeTask.title : customGoal,
    });
  }, [isRunning, timeLeft, mode, activeTask, customGoal, onTimerTick]);

  // Handle Session Completion
  const handleSessionComplete = useCallback(() => {
    localStorage.removeItem('schedy_pomodoro_end_timestamp');
    localStorage.setItem('schedy_pomodoro_is_running', 'false');

    // Play chime sound
    if (settings.soundEnabled) {
      audioService.playCompletionChime(settings.volume);
    }

    // Show desktop notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = mode === 'focus' ? '🎉 Focus Session Completed!' : '⚡ Break Finished!';
      const body = mode === 'focus'
        ? `Great job! Time for a ${sessionRound % settings.longBreakInterval === 0 ? 'long' : 'short'} break.`
        : 'Ready to dive back into focus?';
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch {}
    }

    if (mode === 'focus') {
      // Increment stats
      const todayKey = new Date().toISOString().split('T')[0];
      const newCount = completedSessionsToday + 1;
      const newMins = totalMinutesToday + settings.focusDuration;
      setCompletedSessionsToday(newCount);
      setTotalMinutesToday(newMins);
      try {
        localStorage.setItem(`schedy_pomodoro_count_${todayKey}`, newCount.toString());
        localStorage.setItem(`schedy_pomodoro_mins_${todayKey}`, newMins.toString());
      } catch {}

      // Transition to break
      const isLongBreak = sessionRound % settings.longBreakInterval === 0;
      const nextMode: TimerMode = isLongBreak ? 'longBreak' : 'shortBreak';
      const nextRound = sessionRound >= settings.longBreakInterval ? 1 : sessionRound + 1;
      setSessionRound(nextRound);
      localStorage.setItem('schedy_pomodoro_round', nextRound.toString());
      switchMode(nextMode, settings.autoStartBreaks);
    } else {
      // Transition back to focus
      switchMode('focus', settings.autoStartFocus);
    }
  }, [mode, sessionRound, settings, completedSessionsToday, totalMinutesToday, switchMode]);

  // Timer Countdown Engine with Timestamp Synchronizer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        const targetEndTimeStr = localStorage.getItem('schedy_pomodoro_end_timestamp');
        if (targetEndTimeStr) {
          const targetEndTime = parseInt(targetEndTimeStr, 10);
          const remaining = Math.round((targetEndTime - Date.now()) / 1000);

          if (remaining <= 0) {
            clearInterval(timerRef.current!);
            setTimeLeft(0);
            setIsRunning(false);
            handleSessionComplete();
          } else {
            setTimeLeft(remaining);
          }
        } else {
          // Fallback decrement
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current!);
              setIsRunning(false);
              handleSessionComplete();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, handleSessionComplete]);

  // Dynamic Browser Tab Document Title
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const modeEmoji = mode === 'focus' ? '🎯' : '☕';
    const modeLabel = mode === 'focus' ? 'Focus' : 'Break';

    document.title = isRunning ? `(${formatted}) ${modeEmoji} ${modeLabel} • Schedy` : 'Schedy • Planner & Workspace';

    return () => {
      document.title = 'Schedy • Planner & Workspace';
    };
  }, [timeLeft, isRunning, mode]);

  // Global Spacebar Key Shortcut for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        toggleRunning();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timeLeft]);

  // Quick Adjustment (+5m / -1m)
  const adjustTime = (deltaSeconds: number) => {
    setTimeLeft(prev => {
      const next = Math.max(10, prev + deltaSeconds);
      if (isRunning) {
        const endTimestamp = Date.now() + next * 1000;
        localStorage.setItem('schedy_pomodoro_end_timestamp', endTimestamp.toString());
      } else {
        localStorage.setItem('schedy_pomodoro_paused_seconds', next.toString());
      }
      return next;
    });
  };

  // Reset current mode timer
  const handleReset = () => {
    setIsRunning(false);
    localStorage.removeItem('schedy_pomodoro_end_timestamp');
    localStorage.setItem('schedy_pomodoro_is_running', 'false');
    const dur = getModeDurationSeconds(mode, settings);
    setTimeLeft(dur);
    localStorage.setItem('schedy_pomodoro_paused_seconds', dur.toString());
  };

  // Skip to next mode
  const handleSkip = () => {
    if (mode === 'focus') {
      const isLong = sessionRound % settings.longBreakInterval === 0;
      switchMode(isLong ? 'longBreak' : 'shortBreak', false);
    } else {
      switchMode('focus', false);
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return {
      minutes: m.toString().padStart(2, '0'),
      seconds: s.toString().padStart(2, '0'),
    };
  };

  const { minutes, seconds } = formatTime(timeLeft);
  const totalDuration = getModeDurationSeconds(mode, settings);
  const progressPercent = totalDuration > 0 ? ((totalDuration - timeLeft) / totalDuration) * 100 : 0;

  // Theme color maps for modes
  const modeConfig = {
    focus: {
      label: 'Focus Time',
      subtitle: 'Stay locked in and eliminate distractions',
      icon: <Brain className="w-4 h-4 text-blue-500" />,
      colorClass: 'text-blue-600 dark:text-blue-400',
      ringColor: '#2563eb',
      glowClass: 'from-blue-500/10 via-indigo-500/5 to-transparent',
      pillClass: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
      tagBadge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/40',
    },
    shortBreak: {
      label: 'Short Break',
      subtitle: 'Stretch, hydrate, and rest your eyes',
      icon: <Coffee className="w-4 h-4 text-emerald-500" />,
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      ringColor: '#10b981',
      glowClass: 'from-emerald-500/10 via-teal-500/5 to-transparent',
      pillClass: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
      tagBadge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/40',
    },
    longBreak: {
      label: 'Long Break',
      subtitle: 'Great cycle! Take a walk or enjoy a snack',
      icon: <Sparkles className="w-4 h-4 text-purple-500" />,
      colorClass: 'text-purple-600 dark:text-purple-400',
      ringColor: '#8b5cf6',
      glowClass: 'from-purple-500/10 via-fuchsia-500/5 to-transparent',
      pillClass: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
      tagBadge: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/40',
    },
  };

  const currentMode = modeConfig[mode];

  // Circle dimensions
  const circleRadius = 135;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  return (
    <>
      {/* ========================================================================= */}
      {/* FLOATING MINI TIMER PILL (Rendered when viewing Schedule, Tasks, Notices) */}
      {/* ========================================================================= */}
      {!isActiveView && (isRunning || timeLeft < totalDuration) && (
        <div className="fixed bottom-5 right-5 z-40 animate-fade-in-up">
          <div className="flex items-center gap-2.5 p-2 pr-3.5 rounded-2xl bg-white/95 dark:bg-[#16161a]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/[0.09] shadow-2xl transition-all hover:shadow-blue-500/10">
            {/* Click to open Pomodoro tab */}
            <button
              onClick={onNavigateToPomodoro}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                <Timer className={`w-4 h-4 ${isRunning ? 'animate-pulse' : ''}`} />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {minutes}:{seconds}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    {mode === 'focus' ? 'Focus' : 'Break'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block truncate max-w-[140px] group-hover:text-blue-600 transition-colors">
                  {activeTask ? activeTask.title : customGoal || 'Pomodoro Active'}
                </span>
              </div>
            </button>

            {/* Inline Play / Pause */}
            <button
              onClick={toggleRunning}
              className={`p-2 rounded-xl text-white transition-all active:scale-95 cursor-pointer ml-1 ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-slate-900 dark:bg-white dark:text-slate-950 hover:bg-slate-800'
              }`}
              title={isRunning ? 'Pause Timer' : 'Resume Timer'}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL POMODORO VIEW (Shown when in Pomodoro Tab)                           */}
      {/* ========================================================================= */}
      <div className={`${!isActiveView ? 'hidden' : 'space-y-6 max-w-4xl mx-auto transition-all'} ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-50 dark:bg-[#09090b] p-6 flex flex-col justify-center max-w-none' : ''}`}>
        
        {/* Header Controls Strip */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-900/40 text-blue-600 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </span>
              <span>Pomodoro Focus Timer</span>
            </h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Persistent focus timer stays active across tabs and calendars
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Mute Toggle */}
            <button
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-white dark:bg-[#141418] border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                  : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-600'
              }`}
              title={settings.soundEnabled ? 'Chime sound enabled' : 'Chime sound muted'}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl bg-white dark:bg-[#141418] border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Focus'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-[#141418] border border-slate-200/80 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>

        {/* Main Glassmorphic Timer Card */}
        <div className={`relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/[0.09] bg-white/90 dark:bg-[#121216]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-xl transition-all ${currentMode.glowClass}`}>
          
          {/* Mode Segmented Switcher */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-100/90 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] shadow-inner text-xs font-semibold">
              <button
                onClick={() => switchMode('focus')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'focus' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Focus ({settings.focusDuration}m)</span>
              </button>

              <button
                onClick={() => switchMode('shortBreak')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'shortBreak' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>Short Break ({settings.shortBreakDuration}m)</span>
              </button>

              <button
                onClick={() => switchMode('longBreak')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all cursor-pointer ${
                  mode === 'longBreak' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Long Break ({settings.longBreakDuration}m)</span>
              </button>
            </div>
          </div>

          {/* Central Circular Progress Display */}
          <div className="flex flex-col items-center justify-center my-4">
            <div className="relative flex items-center justify-center w-[300px] h-[300px] sm:w-[320px] sm:h-[320px]">
              
              {/* SVG Progress Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 320 320">
                {/* Background Track Circle */}
                <circle
                  cx="160"
                  cy="160"
                  r={circleRadius}
                  className="text-slate-100 dark:text-white/[0.04]"
                  strokeWidth="12"
                  stroke="currentColor"
                  fill="transparent"
                />

                {/* Animated Foreground Progress Circle */}
                <circle
                  cx="160"
                  cy="160"
                  r={circleRadius}
                  stroke={currentMode.ringColor}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-linear drop-shadow-[0_0_12px_rgba(37,99,235,0.25)]"
                />
              </svg>

              {/* Inner Content overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                
                {/* Status Badge */}
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-2 ${currentMode.tagBadge}`}>
                  {currentMode.icon}
                  <span>{currentMode.label}</span>
                </span>

                {/* Digital Countdown Numbers */}
                <div className="flex items-center justify-center font-mono font-black text-5xl sm:text-6xl tracking-tighter text-slate-900 dark:text-white my-1 select-none">
                  <span>{minutes}</span>
                  <span className={`mx-1 text-slate-300 dark:text-white/20 ${isRunning ? 'animate-pulse' : ''}`}>:</span>
                  <span>{seconds}</span>
                </div>

                {/* Cycle / Round indicator */}
                <div className="flex items-center gap-1.5 mt-2">
                  {Array.from({ length: settings.longBreakInterval }, (_, i) => i + 1).map(round => (
                    <span
                      key={round}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        round < sessionRound
                          ? 'bg-blue-600 dark:bg-blue-400'
                          : round === sessionRound
                          ? 'bg-blue-600 dark:bg-blue-400 ring-4 ring-blue-500/20 animate-pulse'
                          : 'bg-slate-200 dark:bg-white/10'
                      }`}
                      title={`Session ${round} of ${settings.longBreakInterval}`}
                    />
                  ))}
                </div>

                <span className="text-[11px] text-slate-400 font-medium mt-1">
                  Round {sessionRound} of {settings.longBreakInterval}
                </span>
              </div>
            </div>
          </div>

          {/* Primary Controls Row */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 mt-6">
            {/* Quick -1m */}
            <button
              onClick={() => adjustTime(-60)}
              className="p-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Subtract 1 minute"
            >
              -1m
            </button>

            {/* Reset button */}
            <button
              onClick={handleReset}
              className="p-3.5 rounded-2xl bg-slate-100/80 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Reset timer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Main Play / Pause Button */}
            <button
              onClick={toggleRunning}
              className={`flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl text-base font-extrabold text-white shadow-lg transition-all active:scale-95 cursor-pointer min-w-[170px] ${
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                  : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 shadow-slate-900/20'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            {/* Skip button */}
            <button
              onClick={handleSkip}
              className="p-3.5 rounded-2xl bg-slate-100/80 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95 shadow-2xs"
              title="Skip to next session"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Quick +5m */}
            <button
              onClick={() => adjustTime(300)}
              className="p-3 rounded-2xl bg-slate-100/80 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="Add 5 minutes"
            >
              +5m
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400 font-medium mt-4">
            Press <kbd className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">Spacebar</kbd> to quickly Start or Pause
          </p>

        </div>

        {/* Linked Task & Active Focus Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Left (2 Cols): Active Focus Task */}
          <div className="md:col-span-2 p-5 rounded-2xl bg-white/80 dark:bg-[#121216]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                <span>Current Focus Target</span>
              </span>

              {activeTask && onStatusChange && (
                <button
                  onClick={() => {
                    onStatusChange(activeTask, 'completed');
                    setSelectedTaskId('');
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Task Completed</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              {/* Task selector from Schedy schedule */}
              {pendingTasks.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/90 dark:bg-neutral-800/90 text-xs font-semibold text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-neutral-700/80 focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">-- Choose a task to focus on --</option>
                    {pendingTasks.map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.priority.toUpperCase()}] {t.title} {t.category ? `(${t.category})` : ''}
                      </option>
                    ))}
                  </select>

                  {!selectedTaskId && (
                    <input
                      type="text"
                      value={customGoal}
                      onChange={(e) => setCustomGoal(e.target.value)}
                      placeholder="Or type a custom goal (e.g. Finish Chapter 3 review)..."
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] text-xs font-medium text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/[0.06] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={customGoal}
                  onChange={(e) => setCustomGoal(e.target.value)}
                  placeholder="What are you working on right now? (e.g. Code refactoring)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] text-xs font-medium text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-white/[0.06] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              )}

              {(activeTask || customGoal) && (
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Flame className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-bold text-slate-900 dark:text-white truncate">
                      {activeTask ? activeTask.title : customGoal}
                    </span>
                  </div>
                  {activeTask && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 uppercase shrink-0">
                      {activeTask.priority}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right (1 Col): Today's Focus Stats */}
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-[#121216]/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/[0.08] shadow-xs flex flex-col justify-between space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Today's Activity</span>
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Sessions
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {completedSessionsToday}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06]">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">
                  Focus Time
                </span>
                <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  {totalMinutesToday}m
                </span>
              </div>
            </div>

            {/* Ambient Sound Selector */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1 font-semibold text-[11px]">
                <Headphones className="w-3.5 h-3.5" />
                <span>Ambient Audio</span>
              </span>
              <select
                value={settings.ambientSound}
                onChange={(e) => updateSettings({ ambientSound: e.target.value as any })}
                className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 text-xs border border-slate-200/60 dark:border-neutral-700 font-semibold"
              >
                <option value="none">Off</option>
                <option value="tick">Clock Ticking</option>
                <option value="rain">Rain / White Noise</option>
              </select>
            </div>
          </div>

        </div>

        {/* Settings Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
            <div
              className="bg-white/95 dark:bg-[#141418]/95 backdrop-blur-2xl rounded-3xl max-w-md w-full overflow-hidden border border-slate-200/90 dark:border-white/[0.09] shadow-2xl transition-all flex flex-col text-slate-800 dark:text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-900/40">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      Timer Settings
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Customize durations, intervals, and audio alerts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <div className="p-6 space-y-4 text-xs">
                
                {/* Duration Inputs */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Durations (Minutes)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">Focus</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={settings.focusDuration}
                        onChange={(e) => updateSettings({ focusDuration: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full font-bold text-sm bg-transparent border-none outline-none text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">Short Break</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={settings.shortBreakDuration}
                        onChange={(e) => updateSettings({ shortBreakDuration: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full font-bold text-sm bg-transparent border-none outline-none text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">Long Break</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={settings.longBreakDuration}
                        onChange={(e) => updateSettings({ longBreakDuration: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-full font-bold text-sm bg-transparent border-none outline-none text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Long Break Interval */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06]">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Long Break Interval</span>
                    <span className="text-[11px] text-slate-400">Trigger long break after N focus sessions</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={settings.longBreakInterval}
                    onChange={(e) => updateSettings({ longBreakInterval: Math.max(1, parseInt(e.target.value) || 4) })}
                    className="w-16 px-2.5 py-1 text-center font-bold text-xs bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-white/10"
                  />
                </div>

                {/* Automation Toggles */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Auto-start Breaks</span>
                      <span className="text-[11px] text-slate-400">Automatically begin break timer when focus ends</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoStartBreaks}
                      onChange={(e) => updateSettings({ autoStartBreaks: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white block">Auto-start Focus</span>
                      <span className="text-[11px] text-slate-400">Automatically begin focus timer when break ends</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoStartFocus}
                      onChange={(e) => updateSettings({ autoStartFocus: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Sound volume slider */}
                <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">Chime Volume</span>
                    <button
                      type="button"
                      onClick={() => audioService.playCompletionChime(settings.volume)}
                      className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Test Chime
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>

              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/70 dark:bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-5 py-2 rounded-xl font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 shadow-xs transition-all active:scale-95 cursor-pointer text-xs"
                >
                  Done
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </>
  );
};
