export default function Logo({ size = 64 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-gold-400/20 to-grape-500/20 ring-1 ring-white/10"
      style={{ width: size, height: size }}
    >
      <span style={{ fontSize: size * 0.5 }}>🥂</span>
    </div>
  );
}
