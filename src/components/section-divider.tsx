/**
 * Decorative hairline between major sections — a faint gradient line
 * with a slow traveling light pulse. Pure chrome, hidden on paper
 * and safe for reduced motion (the global kill-switch freezes the sweep).
 */
export function SectionDivider() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto w-full max-w-7xl px-4 sm:px-6 print:hidden"
    >
      <div className="section-divider" />
    </div>
  );
}
