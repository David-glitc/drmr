"use client";

const toggles = [
  {
    title: "High Contrast Mode",
    desc: "ADA optimized palette",
    action: "Enable",
  },
  {
    title: "Reduced Motion",
    desc: "Respect prefers-reduced-motion",
    action: "Auto",
  },
];

const notifications = ["Email", "Telegram", "SMS", "Push"];

export default function SettingsPage() {
  return (
    <>
      <header className="rounded-3xl border border-white/10 bg-slate-900/80 px-5 py-6 backdrop-blur sm:px-8 sm:py-8">
        <p className="text-xs uppercase tracking-[0.35em] text-sky-200 sm:text-sm">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
          Accessibility & preferences
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
          Fine-tune the American Dream dashboard for any device or sensory
          preference.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        {toggles.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white">{item.title}</p>
                <p className="text-xs text-slate-400">{item.desc}</p>
              </div>
              <button className="rounded-full border border-white/20 px-4 py-1 text-xs font-semibold text-white">
                {item.action}
              </button>
            </div>
          </div>
        ))}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 md:col-span-2">
          <p className="text-white">Notification Channels</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {notifications.map((channel) => (
              <button
                key={channel}
                className="rounded-full border border-white/20 px-4 py-1 text-white transition hover:border-white"
              >
                {channel}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

