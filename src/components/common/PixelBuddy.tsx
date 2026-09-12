import React, { useState, useEffect, useRef } from 'react';
import { haptics } from '../../utils/haptics';

// Default / Light frames
import frame1left from '../../assets/pixel buddy/frame1left.svg';
import frame2left from '../../assets/pixel buddy/frame2left.svg';
import frame1right from '../../assets/pixel buddy/frame1right.svg';
import frame2right from '../../assets/pixel buddy/frame2right.svg';
import frame1 from '../../assets/pixel buddy/frame1.svg';
import frame2 from '../../assets/pixel buddy/frame2.svg';
import frame3 from '../../assets/pixel buddy/frame3.svg';
import frame4 from '../../assets/pixel buddy/frame4.svg';
import frame5 from '../../assets/pixel buddy/frame5.svg';
import frame6 from '../../assets/pixel buddy/frame6.svg';
import frame7 from '../../assets/pixel buddy/frame7.svg';
import frame8 from '../../assets/pixel buddy/frame8.svg';

// Dark theme frames
import frame1left_dark from '../../assets/pixel buddy/frame1left_dark.svg';
import frame2left_dark from '../../assets/pixel buddy/frame2left_dark.svg';
import frame1right_dark from '../../assets/pixel buddy/frame1right_dark.svg';
import frame2right_dark from '../../assets/pixel buddy/frame2right_dark.svg';
import frame1_dark from '../../assets/pixel buddy/frame1_dark.svg';
import frame2_dark from '../../assets/pixel buddy/frame2_dark.svg';
import frame3_dark from '../../assets/pixel buddy/frame3_dark.svg';
import frame4_dark from '../../assets/pixel buddy/frame4_dark.svg';
import frame5_dark from '../../assets/pixel buddy/frame5_dark.svg';
import frame6_dark from '../../assets/pixel buddy/frame6_dark.svg';
import frame7_dark from '../../assets/pixel buddy/frame7_dark.svg';
import frame8_dark from '../../assets/pixel buddy/frame8_dark.svg';

// Pink theme frames
import frame1left_pink from '../../assets/pixel buddy/frame1left_pink.svg';
import frame2left_pink from '../../assets/pixel buddy/frame2left_pink.svg';
import frame1right_pink from '../../assets/pixel buddy/frame1right_pink.svg';
import frame2right_pink from '../../assets/pixel buddy/frame2right_pink.svg';
import frame1_pink from '../../assets/pixel buddy/frame1_pink.svg';
import frame2_pink from '../../assets/pixel buddy/frame2_pink.svg';
import frame3_pink from '../../assets/pixel buddy/frame3_pink.svg';
import frame4_pink from '../../assets/pixel buddy/frame4_pink.svg';
import frame5_pink from '../../assets/pixel buddy/frame5_pink.svg';
import frame6_pink from '../../assets/pixel buddy/frame6_pink.svg';
import frame7_pink from '../../assets/pixel buddy/frame7_pink.svg';
import frame8_pink from '../../assets/pixel buddy/frame8_pink.svg';

const FRAME_SETS = {
  light: {
    walkLeft: [frame1left, frame2left],
    walkRight: [frame1right, frame2right],
    jump: [frame1, frame2, frame3, frame4, frame5, frame6, frame7, frame8],
    standFront: frame1,
  },
  dark: {
    walkLeft: [frame1left_dark, frame2left_dark],
    walkRight: [frame1right_dark, frame2right_dark],
    jump: [frame1_dark, frame2_dark, frame3_dark, frame4_dark, frame5_dark, frame6_dark, frame7_dark, frame8_dark],
    standFront: frame1_dark,
  },
  pink: {
    walkLeft: [frame1left_pink, frame2left_pink],
    walkRight: [frame1right_pink, frame2right_pink],
    jump: [frame1_pink, frame2_pink, frame3_pink, frame4_pink, frame5_pink, frame6_pink, frame7_pink, frame8_pink],
    standFront: frame1_pink,
  },
};

const ALL_PRELOAD_FRAMES = [
  ...FRAME_SETS.light.walkLeft, ...FRAME_SETS.light.walkRight, ...FRAME_SETS.light.jump,
  ...FRAME_SETS.dark.walkLeft, ...FRAME_SETS.dark.walkRight, ...FRAME_SETS.dark.jump,
  ...FRAME_SETS.pink.walkLeft, ...FRAME_SETS.pink.walkRight, ...FRAME_SETS.pink.jump,
];

const CHEER_MESSAGES = [
  "Hi! I'm Schedy Buddy!",
  "Stay focused today!",
  "Keep up the great work!",
  "Don't forget to take breaks!",
  "One step at a time!",
  "You've got this!",
  "Small progress is still progress!",
  "Stay on schedule!",
];

export interface PixelBuddyProps {
  theme?: 'light' | 'dark' | 'pink';
}

export const PixelBuddy: React.FC<PixelBuddyProps> = ({ theme: propTheme }) => {
  const walkerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const dirRef = useRef<-1 | 1>(-1); // -1 = moving left, 1 = moving right
  const isJumpingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isHoveringRef = useRef(false);
  const currentStepRef = useRef(0);
  const jumpStepRef = useRef(0);

  const [domTheme, setDomTheme] = useState<'light' | 'dark' | 'pink'>(() => {
    if (typeof document !== 'undefined') {
      if (document.documentElement.classList.contains('pink')) return 'pink';
      if (document.documentElement.classList.contains('dark')) return 'dark';
    }
    return 'light';
  });

  const currentTheme = propTheme || domTheme;
  const themeRef = useRef(currentTheme);

  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  const [currentImg, setCurrentImg] = useState(() => (FRAME_SETS[propTheme || domTheme] || FRAME_SETS.light).walkLeft[0]);
  const [speech, setSpeech] = useState<string | null>(null);
  const [bubbleAlign, setBubbleAlign] = useState<'center' | 'left' | 'right'>('center');
  const [isJumping, setIsJumping] = useState(false);

  // Observe DOM theme changes when propTheme is not explicitly supplied
  useEffect(() => {
    if (propTheme) return;
    const checkClass = () => {
      if (typeof document === 'undefined') return;
      if (document.documentElement.classList.contains('pink')) {
        setDomTheme('pink');
      } else if (document.documentElement.classList.contains('dark')) {
        setDomTheme('dark');
      } else {
        setDomTheme('light');
      }
    };
    checkClass();
    const observer = new MutationObserver(checkClass);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [propTheme]);

  // Update current visible image if theme changes mid-stride
  useEffect(() => {
    const frames = FRAME_SETS[currentTheme] || FRAME_SETS.light;
    if (isJumpingRef.current) {
      setCurrentImg(frames.jump[jumpStepRef.current] || frames.jump[0]);
    } else if (isHoveringRef.current) {
      setCurrentImg(frames.standFront);
    } else if (dirRef.current === -1) {
      setCurrentImg(frames.walkLeft[currentStepRef.current]);
    } else {
      setCurrentImg(frames.walkRight[currentStepRef.current]);
    }
  }, [currentTheme]);

  // Preload all frames on mount
  useEffect(() => {
    ALL_PRELOAD_FRAMES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Smooth horizontal walking loop with left/right frames
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) return;

    let animId: number;
    let lastTime = performance.now();
    let stepTimer = 0;
    let pauseTimer = 0;
    let currentStep = 0;

    const speed = 40; // px per second
    const stepInterval = 200; // ms per walking step

    const loop = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const getFrames = () => FRAME_SETS[themeRef.current] || FRAME_SETS.light;

      if (!isJumpingRef.current && !isPausedRef.current) {
        if (pauseTimer > 0) {
          pauseTimer -= delta;
          // Stand still facing current turn
          const f = getFrames();
          setCurrentImg(dirRef.current === -1 ? f.walkLeft[0] : f.walkRight[0]);
        } else {
          // Determine distance based on screen width: on mobile, walk across the entire screen width
          const maxDist =
            window.innerWidth >= 1024
              ? 210
              : window.innerWidth >= 640
              ? 130
              : Math.max(window.innerWidth - 56, 120);

          posRef.current += dirRef.current * speed * delta;

          // Check turnaround bounds
          if (dirRef.current === -1 && posRef.current <= -maxDist) {
            posRef.current = -maxDist;
            dirRef.current = 1;
            pauseTimer = 0.55; // pause 550ms at left turnaround
          } else if (dirRef.current === 1 && posRef.current >= 0) {
            posRef.current = 0;
            dirRef.current = -1;
            pauseTimer = 0.55; // pause 550ms at right turnaround
          }

          // Walk step animation
          stepTimer += delta * 1000;
          if (stepTimer >= stepInterval) {
            stepTimer = 0;
            currentStep = currentStep === 0 ? 1 : 0;
            currentStepRef.current = currentStep;
            const f = getFrames();
            if (dirRef.current === -1) {
              setCurrentImg(f.walkLeft[currentStep]);
            } else {
              setCurrentImg(f.walkRight[currentStep]);
            }
          }
        }

        // Apply translation directly to DOM
        if (walkerRef.current) {
          walkerRef.current.style.transform = `translateX(${posRef.current}px)`;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleClick = () => {
    if (isJumpingRef.current) return;

    try {
      haptics.selection();
    } catch {
      // ignore
    }

    // Set jumping state
    isJumpingRef.current = true;
    setIsJumping(true);

    // Pick cheer message (clean text, no emojis)
    setSpeech((prev) => {
      const filtered = CHEER_MESSAGES.filter((m) => m !== prev);
      return filtered[Math.floor(Math.random() * filtered.length)];
    });

    // Dynamically align speech bubble so it never clips off screen edges
    const curMaxDist =
      window.innerWidth >= 1024
        ? 210
        : window.innerWidth >= 640
        ? 130
        : Math.max(window.innerWidth - 56, 120);

    if (window.innerWidth < 640) {
      if (posRef.current > -80) {
        setBubbleAlign('right');
      } else if (posRef.current < -curMaxDist + 80) {
        setBubbleAlign('left');
      } else {
        setBubbleAlign('center');
      }
    } else {
      setBubbleAlign('center');
    }

    const getFrames = () => FRAME_SETS[themeRef.current] || FRAME_SETS.light;
    const initialFrames = getFrames();

    // Cycle through 8 jump frames (90ms each = 720ms total)
    let jumpStep = 0;
    jumpStepRef.current = 0;
    setCurrentImg(initialFrames.jump[0]);

    const jumpTimer = setInterval(() => {
      jumpStep++;
      jumpStepRef.current = jumpStep;
      const currentFrames = getFrames();
      if (jumpStep < currentFrames.jump.length) {
        setCurrentImg(currentFrames.jump[jumpStep]);
      } else {
        clearInterval(jumpTimer);
        setIsJumping(false);
        isJumpingRef.current = false;
        jumpStepRef.current = 0;
        // If still hovering, face front; otherwise resume walking frame in current direction
        if (isHoveringRef.current) {
          setCurrentImg(currentFrames.standFront);
        } else {
          setCurrentImg(
            dirRef.current === -1
              ? currentFrames.walkLeft[currentStepRef.current]
              : currentFrames.walkRight[currentStepRef.current]
          );
        }
      }
    }, 90);
  };

  // Auto-dismiss speech bubble
  useEffect(() => {
    if (!speech) return;
    const timeout = setTimeout(() => {
      setSpeech(null);
    }, 3200);
    return () => clearTimeout(timeout);
  }, [speech]);

  return (
    <div
      className="pixel-buddy-container relative select-none"
      onMouseEnter={() => {
        if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return;
        isHoveringRef.current = true;
        isPausedRef.current = true;
        if (!isJumpingRef.current) {
          const f = FRAME_SETS[themeRef.current] || FRAME_SETS.light;
          setCurrentImg(f.standFront); // Face front on hover
        }
      }}
      onMouseLeave={() => {
        if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover)').matches) return;
        isHoveringRef.current = false;
        isPausedRef.current = false;
        if (!isJumpingRef.current) {
          const f = FRAME_SETS[themeRef.current] || FRAME_SETS.light;
          setCurrentImg(
            dirRef.current === -1
              ? f.walkLeft[currentStepRef.current]
              : f.walkRight[currentStepRef.current]
          );
        }
      }}
    >
      <div ref={walkerRef} className="pixel-buddy-walker relative will-change-transform">
        {/* Speech Bubble */}
        {speech && (
          <div
            className={`absolute bottom-full mb-2.5 whitespace-nowrap px-2.5 py-1 rounded-xl bg-neutral-900/90 text-white dark:bg-white/95 dark:text-neutral-900 text-[11px] font-semibold tracking-tight shadow-lg backdrop-blur-sm pointer-events-none transition-all z-30 ${
              bubbleAlign === 'right'
                ? 'right-0'
                : bubbleAlign === 'left'
                ? 'left-0'
                : 'right-1/2 translate-x-1/2'
            }`}
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            <span>{speech}</span>
            {/* Bubble arrow pointing down */}
            <div
              className={`absolute top-full -mt-[1px] border-4 border-transparent border-t-neutral-900/90 dark:border-t-white/95 ${
                bubbleAlign === 'right'
                  ? 'right-4'
                  : bubbleAlign === 'left'
                  ? 'left-4'
                  : 'left-1/2 -translate-x-1/2'
              }`}
            />
          </div>
        )}

        {/* Interactive Mascot Button */}
        <button
          type="button"
          onClick={handleClick}
          title="Schedy Buddy (Click to jump!)"
          aria-label="Schedy Buddy pixel mascot"
          className={`relative block cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg transition-transform ${
            isJumping ? 'pixel-buddy-hopping' : ''
          }`}
        >
          {/* Walking / Jumping sprite */}
          <div className="pixel-buddy-sprite w-10 h-10 flex items-center justify-center">
            <img
              src={currentImg}
              alt="Schedy Pixel Buddy Mascot"
              width={40}
              height={40}
              className="w-10 h-10 object-contain pointer-events-none [image-rendering:pixelated]"
              draggable={false}
            />
          </div>

          {/* Ground shadow beneath feet */}
          <div
            className={`w-6 h-1 bg-black/15 dark:bg-white/15 rounded-full mx-auto -mt-0.5 blur-[0.6px] pointer-events-none transition-all duration-200 ${
              isJumping ? 'scale-75 opacity-30' : 'scale-100 opacity-100'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
