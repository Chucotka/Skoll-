import Logo from '../components/Logo';

export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <div className="animate-pulse-soft">
        <Logo size={80} />
      </div>
      <p className="text-white/50">Setting the table…</p>
    </div>
  );
}
