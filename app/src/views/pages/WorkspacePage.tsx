import HomeOfficeCanvas from "../widgets/home-office/HomeOfficeCanvas";
import HomeDashboard, { TimePanel } from "../widgets/home-dashboard/HomeDashboard";

export default function WorkspacePage() {
  return (
    <div className="flex h-full">
      {/* Left: HomeOffice + Dashboard */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* HomeOffice - 상단 */}
        <div className="h-[40%] min-h-[240px] border-b border-border">
          <HomeOfficeCanvas />
        </div>
        {/* Dashboard - 하단 */}
        <div className="flex-1 min-h-0">
          <HomeDashboard />
        </div>
      </div>

      {/* Right: Time Panel */}
      <div className="w-[280px] shrink-0 border-l border-border">
        <TimePanel />
      </div>
    </div>
  );
}
