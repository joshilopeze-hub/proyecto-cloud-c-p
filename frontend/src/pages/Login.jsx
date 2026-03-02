import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { authApi } from "../config/api"

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await authApi.login(form.email, form.password)
      if (res.token) {
        onLogin(res.user, res.token)
        navigate("/eventos")
      } else {
        setError(res.error || "Credenciales incorrectas")
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
        <h2 style={styles.title}>🎟️ Iniciar sesión</h2>
        <p style={styles.sub}>Accede a tu cuenta de Boletealo</p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Correo electrónico</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            style={styles.input}
            placeholder="correo@ejemplo.com"
          />
          <label style={styles.label}>Contraseña</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            style={styles.input}
            placeholder="••••••••"
          />
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
        <p style={styles.footer}>
          ¿No tienes cuenta?{" "}
          <Link to="/registro" style={styles.link}>Regístrate gratis</Link>
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
    width: "100%", maxWidth: "420px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  title: { color: "#fff", marginBottom: "0.25rem", fontSize: "1.6rem" },
  sub: { color: "#aaa", marginBottom: "1.5rem", fontSize: "0.95rem" },
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
    background: "#e94560", color: "#fff", border: "none", padding: "12px",
    borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer",
    marginTop: "0.5rem",
  },
  footer: { textAlign: "center", color: "#aaa", marginTop: "1.5rem", fontSize: "0.9rem" },
  link: { color: "#e94560", textDecoration: "none" },
}
