"use client";

import { useEffect } from "react";

export default function BisCleanup() {
  useEffect(() => {
    const clean = () => {
      document.querySelectorAll("[bis_skin_checked]").forEach((el) => {
        el.removeAttribute("bis_skin_checked");
      });
    };
    clean();
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "bis_skin_checked") {
          (m.target as Element).removeAttribute("bis_skin_checked");
        }
      }
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["bis_skin_checked"],
        subtree: true,
      });
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
