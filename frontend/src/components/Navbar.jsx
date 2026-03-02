import { Link, useNavigate } from "react-router-dom"

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate("/")
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.brand}>🎟️ Boletealo</Link>
      <div style={styles.links}>
        <Link to="/eventos" style={styles.link}>Eventos</Link>
        {user ? (
          <>
            <Link to="/mis-tickets" style={styles.link}>Mis Tickets</Link>
            <Link to="/mis-incidentes" style={styles.link}>Incidentes</Link>
            <span style={styles.userInfo}>Hola, {user.nombre}</span>
            <button onClick={handleLogout} style={styles.btnLogout}>Salir</button>
          </>
        ) : (
          <>
            <Link to="/login" style={styles.link}>Ingresar</Link>
            <Link to="/registro" style={styles.btnRegister}>Registrarse</Link>
          </>
        )}
      </div>
    </nav>
  )
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 2rem",
    height: "64px",
    background: "#1a1a2e",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 100,
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
  },
  brand: {
    fontSize: "1.4rem",
    fontWeight: "bold",
    color: "#e94560",
    textDecoration: "none",
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "1.2rem",
  },
  link: {
    color: "#ccc",
    textDecoration: "none",
    fontSize: "0.95rem",
    transition: "color 0.2s",
  },
  userInfo: {
    color: "#aaa",
    fontSize: "0.9rem",
  },
  btnLogout: {
    background: "transparent",
    border: "1px solid #e94560",
    color: "#e94560",
    padding: "6px 14px",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  btnRegister: {
    background: "#e94560",
    color: "#fff",
    padding: "6px 14px",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "0.9rem",
  },
}
