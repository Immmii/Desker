import HomeOfficeCanvas from "../widgets/home-office/HomeOfficeCanvas";
import TaskDashboard from "../widgets/task-tracker/TaskDashboard";

export default function WorkspacePage() {
  return (
    <div className="flex flex-col h-full">
      {/* HomeOffice - 상단 */}
      <div className="h-[40%] min-h-[240px] border-b border-border">
        <HomeOfficeCanvas />
      </div>
      {/* Task Tracker - 하단 */}
      <div className="flex-1 min-h-0">
        <TaskDashboard />
      </div>
    </div>
  );
}
