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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/dashboard" },
  { title: "Nuevo Estudio", icon: PlusCircle, path: "/nuevo-estudio" },
  { title: "Mis Estudios", icon: FolderOpen, path: "/mis-estudios" },
  { title: "Análisis", icon: BarChart3, path: "/analisis" },
  { title: "Perfil", icon: User, path: "/perfil" },
  { title: "Ayuda", icon: HelpCircle, path: "/ayuda" },
];

const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
  <div className="p-4 space-y-1">
    {menuItems.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onItemClick}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group min-h-[48px]",
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
);

export const Sidebar = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Hamburger button */}
      <div className="lg:hidden fixed left-4 top-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 bg-sidebar-background">
            <div className="pt-6">
              <SidebarContent onItemClick={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed sidebar */}
      <aside className="hidden lg:block fixed left-0 top-16 bottom-0 w-64 bg-sidebar-background border-r border-sidebar-border overflow-y-auto">
        <SidebarContent />
      </aside>
    </>
  );
};
