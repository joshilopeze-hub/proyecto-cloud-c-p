import { NavLink } from "react-router-dom"

export default function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <nav style={styles.nav}>
        <NavLink to="/eventos" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.active : {}) })}>
          🎭 Eventos
        </NavLink>
        <NavLink to="/mis-tickets" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.active : {}) })}>
          🎟️ Mis Tickets
        </NavLink>
        <NavLink to="/mis-incidentes" style={({ isActive }) => ({ ...styles.link, ...(isActive ? styles.active : {}) })}>
          ⚠️ Mis Incidentes
        </NavLink>
      </nav>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: "220px",
    minHeight: "calc(100vh - 64px)",
    background: "#16213e",
    padding: "1.5rem 1rem",
    borderRight: "1px solid #0f3460",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  link: {
    color: "#ccc",
    textDecoration: "none",
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "0.95rem",
    transition: "background 0.2s",
  },
  active: {
    background: "#e94560",
    color: "#fff",
  },
}
