import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Stock from "./pages/Stock";
import Reservations from "./pages/Reservations";
import Maintenance from "./pages/Maintenance";
import Login from "./pages/Login";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Waves } from "lucide-react";

// ── PrivateRoute ──────────────────────────────────────────────────────────────
function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-aqua/30 border-t-aqua rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Redirect to="/login" />;
  return <Component />;
}

// ── Main Layout ───────────────────────────────────────────────────────────────
function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: "Dashboard",  path: "/dashboard",   icon: "📊" },
    { label: "Clientes",   path: "/clients",      icon: "👥" },
    { label: "Estoque",    path: "/stock",        icon: "📦" },
    { label: "Reservas",   path: "/reservations", icon: "📅" },
    { label: "Manutenção", path: "/maintenance",  icon: "🔧" },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} bg-navy text-white transition-all duration-300 flex flex-col shadow-lg flex-shrink-0`}>
        {/* Logo */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-aqua to-aqua/70 rounded-xl flex items-center justify-center flex-shrink-0">
              <Waves size={20} className="text-white" />
            </div>
            {sidebarOpen && <h1 className="font-bold text-lg tracking-tight">PoolParty</h1>}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                location === item.path
                  ? "bg-aqua text-white"
                  : "text-gray-300 hover:bg-white/10"
              }`}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 space-y-2">
          {sidebarOpen && user && (
            <div className="px-3 py-2 rounded-lg bg-white/5 mb-2">
              <div className="text-xs text-gray-400">Logado como</div>
              <div className="text-sm font-semibold text-white">{user.username}</div>
            </div>
          )}
          <Button
            onClick={() => logout()}
            variant="outline"
            className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-sm h-9"
          >
            {sidebarOpen ? "Sair" : "🚪"}
          </Button>
          <Button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            variant="outline"
            className="w-full border-white/20 text-gray-400 hover:bg-white/10 text-sm h-9"
          >
            {sidebarOpen ? "◀ Recolher" : "▶"}
          </Button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-border px-6 py-3 shadow-sm flex-shrink-0">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-navy">PoolParty Manager</h2>
            <div className="text-sm text-gray-500">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
function AppRouter() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/login" component={Login} />

      {/* Protected */}
      <Route path="/dashboard">
        <MainLayout><PrivateRoute component={Dashboard} /></MainLayout>
      </Route>
      <Route path="/clients">
        <MainLayout><PrivateRoute component={Clients} /></MainLayout>
      </Route>
      <Route path="/stock">
        <MainLayout><PrivateRoute component={Stock} /></MainLayout>
      </Route>
      <Route path="/reservations">
        <MainLayout><PrivateRoute component={Reservations} /></MainLayout>
      </Route>
      <Route path="/maintenance">
        <MainLayout><PrivateRoute component={Maintenance} /></MainLayout>
      </Route>

      {/* Default */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
