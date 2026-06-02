export default function AuthBackground({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e293b] text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(59,130,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px'
          }}
        />
      </div>
      <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 animate-auth-float-1 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-32 h-96 w-96 animate-auth-float-2 rounded-full bg-blue-500/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-48 w-48 animate-auth-spin-slow border border-blue-500/20" />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">{children}</div>
      </div>
    </div>
  );
}
