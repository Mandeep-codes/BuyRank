import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-5 text-center">
      <p className="tnum text-6xl font-extrabold text-rule">404</p>
      <h1 className="mt-4 text-3xl font-extrabold font-bold tracking-tight">
        Nothing here
      </h1>
      <p className="mt-3 text-[15px] text-mute">
        This page doesn&apos;t exist, or the listing came off the board.
      </p>
      <Link
        href="/"
        className="pill mx-auto mt-8 bg-pop px-7 py-3.5 text-[16px] font-bold text-paper transition hover:bg-[#d9542f]"
      >
        Back to the board
      </Link>
    </main>
  );
}
