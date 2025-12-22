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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white mb-2">Settings</h1>
        <p className="text-sm text-white/60">
          Fine-tune the DRMR dashboard for any device or sensory preference.
        </p>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {toggles.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-white/10 bg-[#111118] p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-white/60 mt-1">{item.desc}</p>
              </div>
              <button className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10">
                {item.action}
              </button>
            </div>
          </div>
        ))}
        
        <div className="rounded-xl border border-white/10 bg-[#111118] p-4 md:col-span-2">
          <p className="text-sm font-semibold text-white mb-3">Notification Channels</p>
          <div className="flex flex-wrap gap-2">
            {notifications.map((channel) => (
              <button
                key={channel}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
              >
                {channel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
