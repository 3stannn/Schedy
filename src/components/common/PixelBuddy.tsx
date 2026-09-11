import React, { useState, useEffect, useRef } from 'react';
import frame1left from '../../assets/pixel buddy/frame1left.png';
import frame2left from '../../assets/pixel buddy/frame2left.png';
import frame1right from '../../assets/pixel buddy/frame1right.png';
import frame2right from '../../assets/pixel buddy/frame2right.png';
import frame1 from '../../assets/pixel buddy/frame1.png';
import frame2 from '../../assets/pixel buddy/frame2.png';
import frame3 from '../../assets/pixel buddy/frame3.png';
import frame4 from '../../assets/pixel buddy/frame4.png';
import frame5 from '../../assets/pixel buddy/frame5.png';
import frame6 from '../../assets/pixel buddy/frame6.png';
import frame7 from '../../assets/pixel buddy/frame7.png';
import frame8 from '../../assets/pixel buddy/frame8.png';
import { haptics } from '../../utils/haptics';

const JUMP_FRAMES = [
  frame1,
  frame2,
  frame3,
  frame4,
  frame5,
  frame6,
  frame7,
  frame8,
];

const ALL_FRAMES = [
  frame1left,
  frame2left,
  frame1right,
  frame2right,
  ...JUMP_FRAMES,
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

export const PixelBuddy: React.FC = () => {
  const walkerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);
  const dirRef = useRef<-1 | 1>(-1); // -1 = moving left, 1 = moving right
  const isJumpingRef = useRef(false);
  const isPausedRef = useRef(false);
  const isHoveringRef = useRef(false);

  const [currentImg, setCurrentImg] = useState(frame1left);
  const [speech, setSpeech] = useState<string | null>(null);
  const [isJumping, setIsJumping] = useState(false);

  // Preload all frames on mount
  useEffect(() => {
    ALL_FRAMES.forEach((src) => {
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

    const speed = 36; // px per second
    const stepInterval = 200; // ms per walking step

    const loop = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (!isJumpingRef.current && !isPausedRef.current) {
        if (pauseTimer > 0) {
          pauseTimer -= delta;
          // Stand still facing current turn
          setCurrentImg(dirRef.current === -1 ? frame1left : frame1right);
        } else {
          // Determine distance based on screen width
          const maxDist =
            window.innerWidth >= 1024 ? 210 : window.innerWidth >= 640 ? 130 : 65;

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
            if (dirRef.current === -1) {
              setCurrentImg(currentStep === 0 ? frame1left : frame2left);
            } else {
              setCurrentImg(currentStep === 0 ? frame1right : frame2right);
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

    // Cycle through 8 jump frames (90ms each = 720ms total)
    let jumpStep = 0;
    setCurrentImg(JUMP_FRAMES[0]);

    const jumpTimer = setInterval(() => {
      jumpStep++;
      if (jumpStep < JUMP_FRAMES.length) {
        setCurrentImg(JUMP_FRAMES[jumpStep]);
      } else {
        clearInterval(jumpTimer);
        setIsJumping(false);
        isJumpingRef.current = false;
        // If still hovering, face front; otherwise resume walking frame in current direction
        if (isHoveringRef.current) {
          setCurrentImg(frame1);
        } else {
          setCurrentImg(dirRef.current === -1 ? frame1left : frame1right);
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
        isHoveringRef.current = true;
        isPausedRef.current = true;
        if (!isJumpingRef.current) {
          setCurrentImg(frame1); // Face front on hover
        }
      }}
      onMouseLeave={() => {
        isHoveringRef.current = false;
        isPausedRef.current = false;
        if (!isJumpingRef.current) {
          setCurrentImg(dirRef.current === -1 ? frame1left : frame1right);
        }
      }}
    >
      <div ref={walkerRef} className="pixel-buddy-walker relative will-change-transform">
        {/* Speech Bubble */}
        {speech && (
          <div
            className="absolute bottom-full mb-2.5 right-1/2 translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-xl bg-neutral-900/90 text-white dark:bg-white/95 dark:text-neutral-900 text-[11px] font-semibold tracking-tight shadow-lg backdrop-blur-sm pointer-events-none transition-all z-30"
            style={{ animation: 'fadeIn 0.2s ease-out' }}
          >
            <span>{speech}</span>
            {/* Bubble arrow pointing down */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] border-4 border-transparent border-t-neutral-900/90 dark:border-t-white/95" />
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
