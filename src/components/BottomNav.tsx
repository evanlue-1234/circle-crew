import { PlanIntent, ScreenId } from "../navigation";

type Props = {
  active?: ScreenId;
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

const TABS: { id: ScreenId; label: string; icon: JSX.Element }[] = [
  {
    id: "home",
    label: "Circles",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="3" />
        <path d="M6 21v-1a6 6 0 0 1 12 0v1z" />
      </svg>
    ),
  },
  {
    id: "discover",
    label: "Discover",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4-4" />
      </svg>
    ),
  },
  {
    id: "plans",
    label: "Plans",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
      </svg>
    ),
  },
  {
    id: "memories",
    label: "Memories",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="m21 15-5-5L5 21" />
      </svg>
    ),
  },
];

export function BottomNav({ active, onNavigate }: Props) {
  return (
    <div className="bottom-nav">
      {TABS.map((tab) => (
        <div
          key={tab.id}
          className={tab.id === active ? "nav-item active" : "nav-item"}
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(tab.id);
          }}
        >
          {tab.icon}
          {tab.label}
        </div>
      ))}
    </div>
  );
}
