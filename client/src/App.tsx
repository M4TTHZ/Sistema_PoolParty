import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Stock from "./pages/Stock";
import Reservations from "./pages/Reservations";
import Maintenance from "./pages/Maintenance";
import { useAuth } from "./_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useState } from "react";

function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: "📊" },
    { label: "Clientes", path: "/clients", icon: "👥" },
    { label: "Estoque", path: "/stock", icon: "📦" },
    { label: "Reservas", path: "/reservations", icon: "📅" },
    { label: "Manutenção", path: "/maintenance", icon: "🔧" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-navy text-white transition-all duration-300 flex flex-col shadow-lg`}
      >
        <div className="p-4 border-b border-navy-mid">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-aqua to-aqua-dark rounded-lg flex items-center justify-center text-xl">
              🏊
            </div>
            {sidebarOpen && <h1 className="font-bold text-lg">PoolParty</h1>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location === item.path
                  ? "bg-aqua text-white"
                  : "text-gray-300 hover:bg-navy-mid"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-navy-mid space-y-2">
          {sidebarOpen && user && (
            <div className="text-xs text-gray-400 px-2">
              <div className="font-semibold text-white">{user.name}</div>
              <div>{user.email}</div>
            </div>
          )}
          <Button
            onClick={() => logout()}
            className="w-full bg-danger hover:bg-danger/90 text-white text-sm"
          >
            {sidebarOpen ? "Sair" : "🚪"}
          </Button>
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="outline"
            className="w-full text-white border-gray-600 hover:bg-navy-mid text-sm"
          >
            {sidebarOpen ? "◀" : "▶"}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-border px-6 py-4 shadow-sm">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-navy">PoolParty Manager</h2>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();
  const isLocalDev = !import.meta.env.VITE_OAUTH_PORTAL_URL;

  if (loading && !isLocalDev) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">🏊</div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user && !isLocalDev) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-aqua to-aqua-dark">
        <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-6xl mb-4">🏊</div>
          <h1 className="text-3xl font-bold text-navy mb-2">PoolParty Manager</h1>
          <p className="text-gray-600 mb-6">Sistema de gestão para brinquedoteca e espaço de festas</p>
          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full bg-aqua hover:opacity-90 text-white"
          >
            Entrar com Manus
          </Button>
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/stock" component={Stock} />
        <Route path="/reservations" component={Reservations} />
        <Route path="/maintenance" component={Maintenance} />
        <Route path="/" component={Dashboard} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
