import { ComingSoon } from "./ComingSoon";
import { PlanIntent } from "../navigation";

type Props = {
  onNavigate: (target: string, intent?: PlanIntent) => void;
};

export function MemoriesScreen({ onNavigate: _onNavigate }: Props) {
  return (
    <div className="phone-screen-inner">
      <div className="app-header">
        <h2>Memories</h2>
      </div>
      <div className="screen-body">
        <div className="content-pad">
          <ComingSoon
            title="Memories coming soon"
            subtitle="Your past events will live here."
            icon={
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                style={{ width: "28px", height: "28px" }}
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
