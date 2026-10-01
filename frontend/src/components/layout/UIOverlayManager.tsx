"use client";

import { useEffect } from "react";
import { useUIStore } from "@/store/useUIStore";

/**
 * Wasel Egypt — Centralized UI Overlay Manager
 *
 * Monitors top-level modals, drawers, and bottom sheet lifecycle.
 * Automatically handles:
 * 1. Global Escape key handling to dismiss topmost overlay (LIFO stack).
 * 2. Background body scroll locking when an overlay is open.
 */
export default function UIOverlayManager() {
  const { overlayStack, closeTopOverlay } = useUIStore();

  const hasOpenOverlays = overlayStack.length > 0;

  // Handle Escape key to dismiss the topmost overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && hasOpenOverlays) {
        closeTopOverlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasOpenOverlays, closeTopOverlay]);

  // Lock background scroll when any overlay is active
  useEffect(() => {
    if (hasOpenOverlays) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [hasOpenOverlays]);

  return null;
}

