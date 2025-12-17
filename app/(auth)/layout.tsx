"use client";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800">
          {children}
        </div>
      </div>
    </div>
  );
}
