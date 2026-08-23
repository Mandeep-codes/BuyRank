import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 text-center">
      <p className="tnum font-display text-6xl font-extrabold text-rule">404</p>
      <h1 className="mt-4 font-display text-3xl font-extrabold font-bold tracking-tight">
        Nothing here
      </h1>
      <p className="mt-3 text-[15px] text-mute">
        This page doesn&apos;t exist, or the listing came off the board.
      </p>
      <Link
        href="/"
        className="mx-auto mt-8 rounded-lg bg-pop px-6 py-3 text-[15px] font-medium text-paper transition hover:bg-pop"
      >
        Back to the board
      </Link>
    </main>
  );
}
