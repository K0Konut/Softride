import { NavLink, Outlet, useLocation } from "react-router-dom";

const linkBase =
  "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs";
const active = "text-white";
const inactive = "text-zinc-400";

export default function AppShell() {
  const { pathname } = useLocation();
  const isMap = pathname === "/map";

  const navHeight = "calc(72px + env(safe-area-inset-bottom))";

  const navStyle: React.CSSProperties & Record<"--bottom-nav-h", string> = {
    height: navHeight,
    "--bottom-nav-h": navHeight,
  };

  return (
    <div className="h-[100dvh] w-full bg-zinc-950 text-zinc-100 overflow-hidden flex flex-col">
      {/* MAIN (scrollable only when NOT map) */}
      <main
        className={
          isMap
            ? "relative flex-1 overflow-hidden"
            : "relative flex-1 overflow-y-auto overscroll-contain"
        }
        style={
          isMap
            ? undefined
            : {
                paddingLeft: 16,
                paddingRight: 16,
                paddingTop: 24,
                paddingBottom: 24,
              }
        }
      >
        <Outlet />
      </main>

      {/* NAV */}
      <nav
        className="shrink-0 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur"
        style={navStyle}
      >
        <div className="mx-auto flex h-[72px] max-w-screen-sm items-stretch justify-around px-2 py-2">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="text-base">🏠</span>
            Accueil
          </NavLink>

          <NavLink
            to="/map"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="text-base">🗺️</span>
            Carte
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? active : inactive}`
            }
          >
            <span className="text-base">⚙️</span>
            Réglages
          </NavLink>
        </div>

        <div style={{ height: "env(safe-area-inset-bottom)" }} />
      </nav>
    </div>
  );
}
