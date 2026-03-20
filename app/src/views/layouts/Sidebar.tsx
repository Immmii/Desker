import { useAppVM } from "../../viewmodels/app.vm";
import type { SidebarPage } from "../../types/models";
import {
  IconHome,
  IconEditor,
  IconTasks,
  IconTerminal,
  IconPlugins,
  IconSettings,
} from "../shared/Icons";

const NAV_ITEMS: {
  page: SidebarPage;
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
}[] = [
  { page: "workspace", icon: IconHome, label: "홈" },
  { page: "dot-editor", icon: IconEditor, label: "에디터" },
  { page: "tasks", icon: IconTasks, label: "태스크" },
  { page: "terminal", icon: IconTerminal, label: "터미널" },
  { page: "plugins", icon: IconPlugins, label: "플러그인" },
];

const BOTTOM_ITEMS: {
  page: SidebarPage;
  icon: React.FC<{ size?: number; className?: string }>;
  label: string;
}[] = [{ page: "settings", icon: IconSettings, label: "설정" }];

function NavButton({
  item,
  isActive,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[0];
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center w-full transition-colors cursor-pointer ${
        isActive
          ? "text-text-primary"
          : "text-text-secondary hover:text-text-primary"
      }`}
      title={item.label}
      style={{ height: 58 }}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-accent rounded-r" />
      )}

      <div
        className={`flex items-center justify-center w-11 h-11 rounded-xl transition-colors ${
          isActive ? "bg-accent text-white" : ""
        }`}
      >
        <Icon size={22} />
      </div>

      <span className="text-[11px] mt-1 leading-none font-medium">
        {item.label}
      </span>
    </button>
  );
}

export default function Sidebar() {
  const { currentPage, setCurrentPage } = useAppVM();

  return (
    <aside className="flex flex-col w-[84px] h-full shrink-0 bg-bg-secondary border-r border-border">
      <nav className="flex-1 flex flex-col" style={{ paddingTop: 48 }}>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.page}
            item={item}
            isActive={currentPage === item.page}
            onClick={() => setCurrentPage(item.page)}
          />
        ))}
      </nav>
      <div style={{ paddingBottom: 12 }}>
        {BOTTOM_ITEMS.map((item) => (
          <NavButton
            key={item.page}
            item={item}
            isActive={currentPage === item.page}
            onClick={() => setCurrentPage(item.page)}
          />
        ))}
      </div>
    </aside>
  );
}
