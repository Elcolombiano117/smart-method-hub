import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Sidebar />
      {/* En móvil: sin pl, w-screen; en desktop: pl-64 y max-w-7xl centrado */}
      <main className="pt-16 overflow-x-hidden min-w-0 w-screen lg:w-auto lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0 lg:max-w-7xl lg:mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
