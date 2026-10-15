"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

/**
 * Floating glass button that appears once you scroll past the hero and
 * glides you back to the top. Sits under toasts/dialogs (z-40) so it
 * never blocks anything important.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 16, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.85 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          title="Back to top"
          className="glass fixed bottom-5 right-5 z-40 grid size-11 place-items-center rounded-2xl text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-fuchsia-300/40 hover:text-fuchsia-200 hover:shadow-[0_8px_28px_rgb(232_121_249/0.3)] active:scale-95 sm:bottom-6 sm:right-6 print:hidden"
        >
          <ArrowUp className="size-4.5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
