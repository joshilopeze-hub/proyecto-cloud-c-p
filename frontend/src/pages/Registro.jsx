import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authApi } from "../config/api"

export default function Registro({ onLogin }) {
  const [form, setForm] = useState({ nombre: "", apellidos: "", email: "", password: "", rol: "comprador" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }
    setLoading(true)
    try {
      const res = await authApi.register(form)
      if (res.token) {
        onLogin(res.user, res.token)
        navigate(res.user?.rol === "vendedor" ? "/mis-eventos" : "/eventos")
      } else {
        setError(res.error || "Error al registrar usuario")
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>🎟️ Crear cuenta</h2>
        <p style={styles.sub}>Únete a Boletealo gratis</p>

        {/* Selector de rol */}
        <div style={styles.rolSelector}>
          <button
            type="button"
            onClick={() => setForm({ ...form, rol: "comprador" })}
            style={{ ...styles.rolBtn, ...(form.rol === "comprador" ? styles.rolBtnActive : {}) }}
          >
            🎫 Comprador
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, rol: "vendedor" })}
            style={{ ...styles.rolBtn, ...(form.rol === "vendedor" ? styles.rolBtnActiveVendedor : {}) }}
          >
            🏪 Vendedor
          </button>
        </div>
        <p style={styles.rolHint}>
          {form.rol === "comprador"
            ? "Compra entradas para eventos increíbles"
            : "Crea y gestiona tus propios eventos"}
        </p>

        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Nombre</label>
          <input
            type="text" required value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            style={styles.input} placeholder="Tu nombre"
          />
          <label style={styles.label}>Apellidos</label>
          <input
            type="text" required value={form.apellidos}
            onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
            style={styles.input} placeholder="Tus apellidos"
          />
          <label style={styles.label}>Correo electrónico</label>
          <input
            type="email" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={styles.input} placeholder="correo@ejemplo.com"
          />
          <label style={styles.label}>Contraseña</label>
          <input
            type="password" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={styles.input} placeholder="Mínimo 6 caracteres"
          />
          <button type="submit" disabled={loading} style={{
            ...styles.btn,
            background: form.rol === "vendedor" ? "#7c3aed" : "#e94560",
          }}>
            {loading ? "Creando cuenta..." : `Crear cuenta ${form.rol === "vendedor" ? "de vendedor" : ""}`}
          </button>
        </form>
        <p style={styles.footer}>
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" style={styles.link}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: "calc(100vh - 64px)", display: "flex",
    alignItems: "center", justifyContent: "center",
    background: "#0a0a1a", padding: "2rem",
  },
  card: {
    background: "#16213e", borderRadius: "16px", padding: "2.5rem",
    width: "100%", maxWidth: "440px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  title: { color: "#fff", marginBottom: "0.25rem", fontSize: "1.6rem" },
  sub: { color: "#aaa", marginBottom: "1.25rem", fontSize: "0.95rem" },
  rolSelector: {
    display: "flex", gap: "0.75rem", marginBottom: "0.5rem",
  },
  rolBtn: {
    flex: 1, padding: "10px", borderRadius: "10px", border: "2px solid #1a4a8a",
    background: "#0f3460", color: "#aaa", cursor: "pointer", fontSize: "0.95rem",
    fontWeight: "600", transition: "all 0.2s",
  },
  rolBtnActive: {
    border: "2px solid #e94560", background: "#2d1a2e", color: "#e94560",
  },
  rolBtnActiveVendedor: {
    border: "2px solid #7c3aed", background: "#1e1040", color: "#a78bfa",
  },
  rolHint: {
    color: "#888", fontSize: "0.82rem", textAlign: "center", marginBottom: "1rem",
    minHeight: "1.2em",
  },
  error: {
    background: "#3d1a1a", color: "#ff6b6b", padding: "10px 14px",
    borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem",
  },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  label: { color: "#bbb", fontSize: "0.9rem" },
  input: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "10px 14px", borderRadius: "8px", fontSize: "1rem", outline: "none",
  },
  btn: {
    color: "#fff", border: "none", padding: "12px",
    borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer",
    marginTop: "0.5rem", transition: "background 0.2s",
  },
  footer: { textAlign: "center", color: "#aaa", marginTop: "1.5rem", fontSize: "0.9rem" },
  link: { color: "#e94560", textDecoration: "none" },
}
