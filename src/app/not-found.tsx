import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 sm:px-6">
      <p className="label">Not listed</p>
      <p
        className="denom mt-4 text-[clamp(3.4rem,13vw,6rem)]"
        style={{ "--lum": 1 } as React.CSSProperties}
      >
        404
      </p>
      <h1 className="mt-6 text-[24px] font-bold leading-tight tracking-[-0.02em]">
        Nothing here
      </h1>
      <p className="mt-4 max-w-md text-[14px] leading-relaxed text-dim">
        This page doesn&apos;t exist, or the listing came off the board.
      </p>
      <div className="mt-8">
        <Link href="/" className="btn btn-ink">
          Back to the board
        </Link>
      </div>
    </main>
  );
}
