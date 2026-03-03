import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { incidentesApi } from "../config/api"

const TIPOS = [
  { value: "qr_no_reconocido", label: "QR no reconocido" },
  { value: "asiento_ocupado", label: "Asiento ocupado" },
  { value: "evento_cancelado", label: "Evento cancelado o modificado" },
  { value: "no_ingreso", label: "No me dejaron ingresar" },
  { value: "otro", label: "Otro problema" },
]

export default function ReportarIncidente() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ tipo_problema: "qr_no_reconocido", descripcion: "" })
  const [archivo, setArchivo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [exito, setExito] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.descripcion.length < 20) {
      setError("La descripción debe tener al menos 20 caracteres")
      return
    }
    setLoading(true)
    setError("")
    try {
      let evidencias = []
      if (archivo) {
        try {
          const s3Key = await incidentesApi.uploadFile(archivo)
          if (s3Key) evidencias = [{ s3Key, nombre: archivo.name, tipo: archivo.type }]
        } catch {
          // Si falla el upload de evidencia, continuamos sin ella
        }
      }
      const res = await incidentesApi.create({
        ticket_id: ticketId,
        tipo_problema: form.tipo_problema,
        descripcion: form.descripcion,
        evidencias,
      })
      if (res.incidenteId || res.incidente_id || res.incidente || res.message) {
        setExito(true)
      } else {
        setError(res.error || "Error al crear el incidente")
      }
    } catch (err) {
      setError("Error de conexión: " + (err?.message || "Intenta nuevamente."))
    } finally {
      setLoading(false)
    }
  }

  if (exito) {
    return (
      <div style={styles.page}>
        <div style={{ ...styles.card, textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
          <h2 style={styles.cardTitle}>Incidente reportado</h2>
          <p style={styles.info}>Tu reporte ha sido enviado. Te contactaremos pronto.</p>
          <div style={styles.btnRow}>
            <button onClick={() => navigate("/mis-incidentes")} style={styles.btn}>Ver mis incidentes</button>
            <button onClick={() => navigate("/mis-tickets")} style={styles.btnOutline}>Volver a mis tickets</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>⚠️ Reportar incidente</h2>
        <p style={styles.info}>Ticket: <strong style={{ color: "#e94560" }}>{ticketId}</strong></p>
        {error && <div style={styles.error}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Tipo de problema</label>
          <select
            value={form.tipo_problema}
            onChange={(e) => setForm({ ...form, tipo_problema: e.target.value })}
            style={styles.select}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          <label style={styles.label}>Descripción del problema (mín. 20 caracteres)</label>
          <textarea
            required
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            style={styles.textarea}
            rows={5}
            placeholder="Describe detalladamente lo que ocurrió..."
          />
          <small style={{ color: "#666" }}>{form.descripcion.length} caracteres</small>

          <label style={styles.label}>Evidencia (imagen opcional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setArchivo(e.target.files[0])}
            style={styles.fileInput}
          />
          {archivo && <small style={{ color: "#aaa" }}>📎 {archivo.name}</small>}

          <div style={styles.btnRow}>
            <button type="button" onClick={() => navigate(-1)} style={styles.btnOutline}>← Cancelar</button>
            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? "Enviando..." : "Enviar reporte"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: { background: "#0a0a1a", minHeight: "calc(100vh - 64px)", padding: "2rem", display: "flex", justifyContent: "center" },
  card: { background: "#16213e", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "560px", height: "fit-content", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
  cardTitle: { color: "#fff", fontSize: "1.4rem", marginBottom: "0.5rem" },
  info: { color: "#aaa", marginBottom: "1rem", fontSize: "0.95rem" },
  error: { background: "#3d1a1a", color: "#ff6b6b", padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem" },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  label: { color: "#bbb", fontSize: "0.9rem" },
  select: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "10px", borderRadius: "8px", fontSize: "1rem",
  },
  textarea: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "10px 14px", borderRadius: "8px", fontSize: "0.95rem",
    resize: "vertical", outline: "none", fontFamily: "sans-serif",
  },
  fileInput: { color: "#aaa", fontSize: "0.9rem" },
  btnRow: { display: "flex", gap: "1rem", marginTop: "1rem" },
  btn: {
    flex: 1, background: "#e94560", color: "#fff", border: "none",
    padding: "12px", borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer",
  },
  btnOutline: {
    flex: 1, background: "transparent", color: "#e94560",
    border: "2px solid #e94560", padding: "12px", borderRadius: "8px",
    fontSize: "1rem", cursor: "pointer",
  },
}
