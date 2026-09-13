import Link from "next/link";

/**
 * Shell for the signed-out routes: a single centred window on a soft ground.
 * The navbar still comes from the root layout, so the theme toggle stays
 * available before sign-in.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-20">
      {/* Ambient accent wash behind the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute top-[-20%] left-1/2 size-[36rem] -translate-x-1/2 rounded-full opacity-[0.18] blur-3xl"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--accent) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-[25rem] animate-fade-up">
        {children}
      </div>

      <p className="relative mt-8 text-xs text-ink-subtle">
        <Link href="/" className="transition-colors hover:text-ink-muted">
          ← Back to overview
        </Link>
      </p>
    </div>
  );
}
