import { useState, useEffect, createContext, useContext } from "react";

// ============== CONTEXT ==============
const AuthContext = createContext(null);
const ThemeContext = createContext(null);

export function useAuth() { return useContext(AuthContext); }
export function useTheme() { return useContext(ThemeContext); }

const API = "http://localhost:4000/api";

// ============== API HELPERS ==============
async function api(path, opts = {}) {
  const token = localStorage.getItem("fitcore_token");
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "API Error");
  }
  return res.json();
}

export { api, API };

// ============== PAGES ==============
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import DashboardPage from "./pages/DashboardPage";
import ChatPage from "./pages/ChatPage";
import StatsPage from "./pages/StatsPage";
import ProfilePage from "./pages/ProfilePage";

// ============== APP ==============
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("fitcore_token");
    if (token) {
      api("/auth/me")
        .then((u) => { setUser(u); setPage(u.onboarded ? "dashboard" : "onboarding"); })
        .catch(() => { localStorage.removeItem("fitcore_token"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("fitcore_token", token);
    setUser(userData);
    setPage(userData.onboarded ? "dashboard" : "onboarding");
  };

  const logout = () => {
    localStorage.removeItem("fitcore_token");
    setUser(null);
    setPage("auth");
  };

  const completeOnboarding = (updatedUser) => {
    setUser(updatedUser);
    setPage("dashboard");
  };

  if (loading) return <LoadingScreen />;

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <AuthContext.Provider value={{ user, setUser, login, logout }}>
        <div className={`app-root ${darkMode ? "dark" : "light"}`}>
          {!user ? (
            <AuthPage />
          ) : !user.onboarded ? (
            <OnboardingPage onComplete={completeOnboarding} />
          ) : (
            <MainLayout page={page} setPage={setPage}>
              {page === "dashboard" && <DashboardPage />}
              {page === "chat" && <ChatPage />}
              {page === "stats" && <StatsPage />}
              {page === "profile" && <ProfilePage />}
            </MainLayout>
          )}
        </div>
      </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

// ============== LAYOUT ==============
function MainLayout({ children, page, setPage }) {
  const { user, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [sideOpen, setSideOpen] = useState(false);

  const navItems = [
    { id: "dashboard", icon: "◉", label: "Panel" },
    { id: "chat", icon: "◈", label: "Chat IA" },
    { id: "stats", icon: "◎", label: "Estadísticas" },
    { id: "profile", icon: "◐", label: "Perfil" },
  ];

  return (
    <div className="main-layout">
      {/* Mobile top bar */}
      <header className="mobile-header">
        <button className="menu-btn" onClick={() => setSideOpen(!sideOpen)}>☰</button>
        <span className="logo-text">FITCORE</span>
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? "☀" : "☾"}
        </button>
      </header>

      {/* Sidebar */}
      <nav className={`sidebar ${sideOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">FITCORE</span>
          </div>
          <div className="user-badge">
            <div className="avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
            <span className="user-name">{user?.name}</span>
          </div>
        </div>

        <div className="nav-items">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => { setPage(item.id); setSideOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className="theme-toggle-side" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀ Modo Claro" : "☾ Modo Oscuro"}
          </button>
          <button className="logout-btn" onClick={logout}>↗ Cerrar Sesión</button>
        </div>
      </nav>

      {sideOpen && <div className="sidebar-overlay" onClick={() => setSideOpen(false)} />}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-pulse">
        <span className="logo-icon large">⬡</span>
        <p>FITCORE</p>
      </div>
    </div>
  );
}
