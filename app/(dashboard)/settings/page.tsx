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
      <header className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
        <p className="text-[10px] uppercase tracking-[0.3em] text-sky-200 sm:text-xs">
          Settings
        </p>
        <h1 className="mt-1.5 text-xl font-semibold text-white sm:text-2xl">
          Accessibility & preferences
        </h1>
        <p className="mt-1.5 max-w-2xl text-xs text-slate-300 sm:text-sm">
          Fine-tune the American Dream dashboard for any device or sensory
          preference.
        </p>
      </header>

      <section className="grid gap-2 md:grid-cols-2">
        {toggles.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-white/10 bg-slate-950/60 p-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">{item.title}</p>
                <p className="text-[10px] text-slate-400">{item.desc}</p>
              </div>
              <button className="cursor-pointer rounded-full border border-white/20 px-3 py-1 text-[10px] font-semibold text-white transition hover:border-white">
                {item.action}
              </button>
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 md:col-span-2">
          <p className="text-sm text-white">Notification Channels</p>
          <div className="mt-2.5 flex flex-wrap gap-2 text-[10px]">
            {notifications.map((channel) => (
              <button
                key={channel}
                className="cursor-pointer rounded-full border border-white/20 px-3 py-1 text-white transition hover:border-white"
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

