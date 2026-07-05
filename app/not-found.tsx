import React from "react";
import Link from "next/link";

const NotFound = () => {
  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 px-4">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-extrabold text-primary">404</h1>

        <h2 className="mt-4 text-3xl font-bold">Page Not Found</h2>

        <p className="mt-2 text-base-content/70">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-8">
          <Link href="/dashboard" className="btn btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
