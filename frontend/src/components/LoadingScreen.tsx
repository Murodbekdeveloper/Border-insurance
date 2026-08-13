export function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-950">
      <span className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500 dark:border-slate-800" />
    </div>
  );
}
