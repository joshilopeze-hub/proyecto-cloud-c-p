import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { eventosApi } from "../config/api"

const CATEGORIAS = ["concierto", "deporte", "teatro", "festival", "conferencia", "otro"]

const zonaVacia = () => ({ nombre: "", precio: "", disponibles: "" })

export default function CrearEvento() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [form, setForm] = useState({
    nombre: "",
    categoria: "concierto",
    fecha: "",
    hora: "",
    lugar: "",
    ciudad: "",
    descripcion: "",
    imagen_url: "",
  })

  const [zonas, setZonas] = useState([zonaVacia()])

  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  // ── Zonas helpers ──
  const addZona = () => setZonas((z) => [...z, zonaVacia()])
  const removeZona = (idx) => setZonas((z) => z.filter((_, i) => i !== idx))
  const setZonaField = (idx, key, val) =>
    setZonas((z) => z.map((z2, i) => (i === idx ? { ...z2, [key]: val } : z2)))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validar zonas
    for (const z of zonas) {
      if (!z.nombre.trim()) { setError("Todas las zonas deben tener nombre"); return }
      if (!z.precio || isNaN(z.precio) || Number(z.precio) < 0) { setError("Precio de zona inválido"); return }
      if (!z.disponibles || isNaN(z.disponibles) || Number(z.disponibles) < 1) { setError("Disponibles de zona inválido"); return }
    }

    const payload = {
      ...form,
      zonas: zonas.map((z) => ({
        nombre: z.nombre.trim(),
        precio: Number(z.precio),
        disponibles: Number(z.disponibles),
      })),
    }

    setLoading(true)
    try {
      const res = await eventosApi.create(payload)
      if (res.eventoId || res.evento?.eventoId) {
        setSuccess("¡Evento creado exitosamente!")
        setTimeout(() => navigate("/mis-eventos"), 1500)
      } else {
        setError(res.error || "No se pudo crear el evento")
      }
    } catch {
      setError("Error de conexión. Intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎪 Crear nuevo evento</h1>
          <button onClick={() => navigate("/mis-eventos")} style={styles.btnBack}>
            ← Mis Eventos
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* ── Info básica ── */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Información del evento</h3>
            <div style={styles.grid2}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Nombre del evento *</label>
                <input
                  required value={form.nombre}
                  onChange={(e) => setField("nombre", e.target.value)}
                  style={styles.input} placeholder="Ej: Festival de Verano 2026"
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Categoría *</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setField("categoria", e.target.value)}
                  style={styles.select}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c} style={{ textTransform: "capitalize" }}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Fecha *</label>
                <input
                  type="date" required value={form.fecha}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setField("fecha", e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Hora *</label>
                <input
                  type="time" required value={form.hora}
                  onChange={(e) => setField("hora", e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Lugar / Venue *</label>
                <input
                  required value={form.lugar}
                  onChange={(e) => setField("lugar", e.target.value)}
                  style={styles.input} placeholder="Ej: Estadio Nacional"
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Ciudad *</label>
                <input
                  required value={form.ciudad}
                  onChange={(e) => setField("ciudad", e.target.value)}
                  style={styles.input} placeholder="Ej: Lima"
                />
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setField("descripcion", e.target.value)}
                style={styles.textarea}
                placeholder="Describe tu evento: artistas, actividades, recomendaciones..."
                rows={3}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>URL de imagen (opcional)</label>
              <input
                type="url" value={form.imagen_url}
                onChange={(e) => setField("imagen_url", e.target.value)}
                style={styles.input} placeholder="https://..."
              />
            </div>
          </div>

          {/* ── Zonas / Precios ── */}
          <div style={styles.section}>
            <div style={styles.zonasHeader}>
              <h3 style={styles.sectionTitle}>Zonas y precios</h3>
              <button type="button" onClick={addZona} style={styles.btnAddZona}>
                + Agregar zona
              </button>
            </div>
            <p style={styles.zonasHint}>Define las diferentes áreas y sus precios (ej: General, VIP, Platea)</p>

            {zonas.map((zona, idx) => (
              <div key={idx} style={styles.zonaRow}>
                <div style={styles.zonaNum}>{idx + 1}</div>
                <div style={styles.zonaFields}>
                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSm}>Nombre de zona</label>
                    <input
                      required value={zona.nombre}
                      onChange={(e) => setZonaField(idx, "nombre", e.target.value)}
                      style={styles.inputSm} placeholder="Ej: General"
                    />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSm}>Precio (S/)</label>
                    <input
                      type="number" required min="0" step="0.01" value={zona.precio}
                      onChange={(e) => setZonaField(idx, "precio", e.target.value)}
                      style={styles.inputSm} placeholder="0.00"
                    />
                  </div>
                  <div style={styles.fieldGroup}>
                    <label style={styles.labelSm}>Entradas disponibles</label>
                    <input
                      type="number" required min="1" value={zona.disponibles}
                      onChange={(e) => setZonaField(idx, "disponibles", e.target.value)}
                      style={styles.inputSm} placeholder="100"
                    />
                  </div>
                </div>
                {zonas.length > 1 && (
                  <button type="button" onClick={() => removeZona(idx)} style={styles.btnRemoveZona}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ── Preview precio ── */}
          {zonas.some((z) => z.precio) && (
            <div style={styles.previewBox}>
              💰 Precio desde:{" "}
              <strong style={{ color: "#e94560" }}>
                S/ {Math.min(...zonas.filter((z) => z.precio).map((z) => Number(z.precio))).toFixed(2)}
              </strong>
              {" · "}
              Total entradas:{" "}
              <strong style={{ color: "#22c55e" }}>
                {zonas.reduce((acc, z) => acc + (Number(z.disponibles) || 0), 0).toLocaleString()}
              </strong>
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.btnSubmit}>
            {loading ? "Publicando evento..." : "🚀 Publicar evento"}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: { background: "#0a0a1a", minHeight: "calc(100vh - 64px)", padding: "2rem" },
  container: { maxWidth: "800px", margin: "0 auto" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: { color: "#fff", fontSize: "1.8rem" },
  btnBack: {
    background: "transparent", color: "#aaa", border: "1px solid #333",
    padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.9rem",
  },
  error: {
    background: "#3d1a1a", color: "#ff6b6b", padding: "12px 16px",
    borderRadius: "8px", marginBottom: "1.25rem", fontSize: "0.9rem",
  },
  success: {
    background: "#1a3d2a", color: "#22c55e", padding: "12px 16px",
    borderRadius: "8px", marginBottom: "1.25rem", fontSize: "0.9rem",
  },
  form: { display: "flex", flexDirection: "column", gap: "1.5rem" },
  section: {
    background: "#16213e", borderRadius: "12px", padding: "1.5rem",
    display: "flex", flexDirection: "column", gap: "1rem",
  },
  sectionTitle: { color: "#fff", fontSize: "1rem", marginBottom: "0.25rem" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { color: "#bbb", fontSize: "0.88rem" },
  labelSm: { color: "#bbb", fontSize: "0.82rem" },
  input: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "9px 12px", borderRadius: "8px", fontSize: "0.95rem", outline: "none",
  },
  inputSm: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "7px 10px", borderRadius: "6px", fontSize: "0.9rem", outline: "none",
    width: "100%",
  },
  select: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "9px 12px", borderRadius: "8px", fontSize: "0.95rem", outline: "none",
  },
  textarea: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "9px 12px", borderRadius: "8px", fontSize: "0.95rem", outline: "none",
    resize: "vertical", fontFamily: "inherit",
  },
  zonasHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  zonasHint: { color: "#888", fontSize: "0.82rem", marginTop: "-0.5rem" },
  btnAddZona: {
    background: "#1e1040", color: "#a78bfa", border: "1px solid #7c3aed",
    padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "0.88rem",
    fontWeight: "600",
  },
  zonaRow: {
    display: "flex", alignItems: "flex-end", gap: "0.75rem",
    background: "#0d1a35", borderRadius: "10px", padding: "0.75rem 1rem",
  },
  zonaNum: {
    color: "#a78bfa", fontWeight: "bold", fontSize: "1rem",
    width: "1.2rem", flexShrink: 0, paddingBottom: "6px",
  },
  zonaFields: {
    flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem",
  },
  btnRemoveZona: {
    background: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b",
    width: "28px", height: "28px", borderRadius: "6px", cursor: "pointer",
    fontSize: "0.8rem", flexShrink: 0, marginBottom: "4px",
  },
  previewBox: {
    background: "#16213e", border: "1px solid #1a4a8a", borderRadius: "10px",
    padding: "0.75rem 1.25rem", color: "#aaa", fontSize: "0.92rem",
  },
  btnSubmit: {
    background: "#7c3aed", color: "#fff", border: "none", padding: "14px",
    borderRadius: "10px", fontSize: "1.05rem", fontWeight: "bold", cursor: "pointer",
    marginTop: "0.5rem",
  },
}
