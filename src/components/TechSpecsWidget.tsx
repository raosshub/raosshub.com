import { Cpu, Monitor, BatteryCharging, Wifi } from "lucide-react";

interface TechSpecsWidgetProps {
  chip?: string;
  display?: string;
  battery?: string;
  router?: string;
}

export default function TechSpecsWidget({ chip, display, battery, router }: TechSpecsWidgetProps) {
  const specs = [
    { label: "Chip", value: chip || "—", icon: Cpu },
    { label: "Display", value: display || "—", icon: Monitor },
    { label: "Battery", value: battery || "—", icon: BatteryCharging },
    { label: "Router", value: router || "—", icon: Wifi },
  ];

  return (
    <div className="hub-card">
      <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
        Technical Specifications
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {specs.map((spec) => {
          const Icon = spec.icon;
          return (
            <div
              key={spec.label}
              className="flex items-start gap-2.5 p-2.5 rounded-lg"
              style={{ background: "var(--bg-base)" }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--accent-dim)" }}
              >
                <Icon size={14} style={{ color: "var(--accent-text)" }} />
              </div>
              <div className="min-w-0">
                <div
                  className="text-[10px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                >
                  {spec.label}
                </div>
                <div
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {spec.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
