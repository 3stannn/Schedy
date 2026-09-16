import React, { useState, useEffect, useRef, useCallback } from 'react';

// Global modal counter for nested modals (e.g. ConfirmModal on top of EventModal)
let activeModalCount = 0;
let savedScrollY = 0;

function lockBodyScroll() {
  if (activeModalCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }
  activeModalCount++;
}

function unlockBodyScroll() {
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    const top = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    if (top) {
      window.scrollTo(0, -parseInt(top, 10) || savedScrollY || 0);
    }
  }
}

export interface UseModalBehaviorOptions {
  isOpen: boolean;
  onClose: () => void;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  enableDrag?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export interface DragHandleProps {
  onPointerDown: (e: React.PointerEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  className?: string;
  style?: React.CSSProperties;
}

export function useModalBehavior({
  isOpen,
  onClose,
  initialFocusRef,
  enableDrag = true,
  closeOnEscape = true,
  closeOnBackdrop = false,
}: UseModalBehaviorOptions) {
  const modalRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Drag-to-dismiss states
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Drag tracking refs
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Focus Mode state (for distraction-free expanded workspace)
  const [isFocusMode, setIsFocusMode] = useState(false);

  // 1. Scroll Lock Management
  useEffect(() => {
    if (!isOpen) return;

    // Record previously active element for focus restoration
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        try {
          previousActiveElementRef.current.focus();
        } catch {
          // Ignore if unmounted
        }
      }
    };
  }, [isOpen]);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
      setIsClosing(false);
      setIsFocusMode(false);
    }
  }

  // 2. Keyboard Focus Trap & Auto-focus
  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus primary input or first focusable element
    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      if (modalRef.current) {
        const firstInput = modalRef.current.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [contenteditable="true"]'
        );
        if (firstInput) {
          firstInput.focus();
        } else {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }
    }, 60);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape dismissal
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        e.stopPropagation();
        if (isFocusMode) {
          setIsFocusMode(false);
        } else {
          onClose();
        }
        return;
      }

      // Tab key focus trap
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, closeOnEscape, isFocusMode, onClose, initialFocusRef]);

  // 3. Drag Gesture Tracking
  const handleDragStart = useCallback((clientY: number) => {
    if (!enableDrag || isFocusMode) return;
    startYRef.current = clientY;
    startTimeRef.current = Date.now();
    isDraggingRef.current = true;
    setIsDragging(true);
  }, [enableDrag, isFocusMode]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDraggingRef.current) return;
    const deltaY = clientY - startYRef.current;

    if (deltaY < 0) {
      // Upward drag: subtle resistance
      setDragOffset(deltaY * 0.15);
    } else {
      // Downward drag: 1:1 tactile movement
      setDragOffset(deltaY);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    const deltaY = dragOffset;
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = deltaY / Math.max(elapsed, 1);

    // Dismiss if pulled down > 80px or rapid downward flick (> 0.4px/ms and > 30px)
    if (deltaY > 80 || (velocity > 0.4 && deltaY > 30)) {
      setIsClosing(true);
      setDragOffset(window.innerHeight);
      setTimeout(() => {
        onClose();
        setIsClosing(false);
        setDragOffset(0);
      }, 200);
    } else {
      // Spring back to top
      setDragOffset(0);
    }
  }, [dragOffset, onClose]);

  // Global window listeners while dragging so finger/mouse can leave the handle
  useEffect(() => {
    if (!isDragging) return;

    const onPointerMove = (e: PointerEvent) => {
      handleDragMove(e.clientY);
    };
    const onPointerUp = () => {
      handleDragEnd();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Drag handle props to attach to the handle or header
  const dragHandleProps: DragHandleProps = {
    onPointerDown: (e: React.PointerEvent) => {
      // Only primary mouse button or touch
      if (e.button !== 0) return;
      handleDragStart(e.clientY);
    },
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length > 0) {
        handleDragStart(e.touches[0].clientY);
      }
    },
  };

  // 4. Backdrop Click and Touch Handling
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  const handleBackdropTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
    }
  }, []);

  // 5. Dynamic Transform Style for Modal Container
  const modalStyle: React.CSSProperties = {
    transform: dragOffset !== 0 ? `translateY(${dragOffset}px)` : undefined,
    transition: isDragging
      ? 'none'
      : isClosing
        ? 'transform 0.2s cubic-bezier(0.32, 0.72, 0, 1)'
        : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    touchAction: 'pan-y',
  };

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode(prev => !prev);
  }, []);

  return {
    modalRef,
    backdropRef,
    dragHandleProps,
    modalStyle,
    isDragging,
    isClosing,
    isFocusMode,
    setIsFocusMode,
    toggleFocusMode,
    handleBackdropClick,
    handleBackdropTouchMove,
  };
}
