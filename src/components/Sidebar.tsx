import { NavLink } from "react-router-dom";
import { 
  Home, 
  PlusCircle, 
  FolderOpen, 
  BarChart3, 
  User, 
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Inicio", icon: Home, path: "/" },
  { title: "Nuevo Estudio", icon: PlusCircle, path: "/nuevo-estudio" },
  { title: "Mis Estudios", icon: FolderOpen, path: "/mis-estudios" },
  { title: "Análisis", icon: BarChart3, path: "/analisis" },
  { title: "Perfil", icon: User, path: "/perfil" },
  { title: "Ayuda", icon: HelpCircle, path: "/ayuda" },
];

export const Sidebar = () => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-sidebar-background border-r border-sidebar-border overflow-y-auto">
      <div className="p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-md"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 font-medium">{item.title}</span>
                <ChevronRight 
                  className={cn(
                    "h-4 w-4 transition-transform",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </aside>
  );
};
