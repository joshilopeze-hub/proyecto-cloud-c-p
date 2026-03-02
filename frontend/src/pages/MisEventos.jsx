import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { eventosApi } from "../config/api"

function formatFecha(fecha) {
  if (!fecha) return ""
  const [y, m, d] = fecha.split("-")
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`
}

const CATEGORIA_COLOR = {
  concierto:   "#7c3aed",
  deporte:     "#16a34a",
  teatro:      "#b45309",
  festival:    "#0891b2",
  conferencia: "#0369a1",
  otro:        "#64748b",
}

export default function MisEventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    eventosApi.misEventos()
      .then((res) => {
        if (res.error) setError(res.error)
        else setEventos(res.eventos || [])
      })
      .catch(() => setError("No se pudieron cargar tus eventos"))
      .finally(() => setLoading(false))
  }, [])

  const handleToggle = async (eventoId, estadoActual) => {
    const accion = estadoActual === "activo" ? "desactivar" : "activar"
    if (!window.confirm(`¿Seguro que quieres ${accion} este evento?`)) return
    try {
      const res = await eventosApi.toggle(eventoId)
      if (res.estado !== undefined || res.evento) {
        const nuevoEstado = res.estado || res.evento?.estado
        setEventos((prev) =>
          prev.map((ev) => ev.eventoId === eventoId ? { ...ev, estado: nuevoEstado } : ev)
        )
      } else {
        alert(res.error || "No se pudo cambiar el estado")
      }
    } catch {
      alert("Error de conexión")
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🏪 Mis Eventos</h1>
        <button onClick={() => navigate("/crear-evento")} style={styles.btnNew}>
          + Crear evento
        </button>
      </div>

      {loading && <p style={styles.msg}>Cargando tus eventos...</p>}
      {error && <p style={{ ...styles.msg, color: "#ff6b6b" }}>{error}</p>}
      {!loading && !error && eventos.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>🎪</p>
          <p style={styles.emptyText}>Aún no has creado ningún evento</p>
          <button onClick={() => navigate("/crear-evento")} style={styles.btn}>
            Crear mi primer evento
          </button>
        </div>
      )}

      <div style={styles.list}>
        {eventos.map((evento) => (
          <EventoCard
            key={evento.eventoId}
            evento={evento}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  )
}

function EventoCard({ evento, onToggle }) {
  const activo = evento.estado === "activo"
  const catColor = CATEGORIA_COLOR[evento.categoria] || "#64748b"
  const totalDisponibles = (evento.zonas || []).reduce(
    (acc, z) => acc + (Number(z.disponibles) || 0), 0
  )

  return (
    <div style={{ ...styles.card, opacity: activo ? 1 : 0.7 }}>
      {/* Banda de categoría */}
      <div style={{ ...styles.catBand, background: catColor }}>
        {evento.categoria}
      </div>

      <div style={styles.cardBody}>
        <div style={styles.cardTop}>
          <div style={styles.cardInfo}>
            <h3 style={styles.cardTitle}>{evento.nombre}</h3>
            <p style={styles.cardMeta}>
              📅 {formatFecha(evento.fecha)}
              {evento.hora ? ` · ${evento.hora}` : ""}
            </p>
            <p style={styles.cardMeta}>📍 {evento.lugar}{evento.ciudad ? `, ${evento.ciudad}` : ""}</p>
            {evento.descripcion && (
              <p style={styles.cardDesc}>
                {evento.descripcion.length > 100
                  ? evento.descripcion.slice(0, 100) + "…"
                  : evento.descripcion}
              </p>
            )}
          </div>
          <div style={styles.cardStats}>
            <div style={styles.stat}>
              <span style={{ ...styles.statVal, color: "#e94560" }}>
                S/ {evento.precioDesde ? Number(evento.precioDesde).toFixed(2) : "—"}
              </span>
              <span style={styles.statLbl}>desde</span>
            </div>
            <div style={styles.stat}>
              <span style={{
                ...styles.statVal,
                color: totalDisponibles >= 50 ? "#22c55e" : totalDisponibles > 0 ? "#f59e0b" : "#ff6b6b",
              }}>
                {totalDisponibles.toLocaleString()}
              </span>
              <span style={styles.statLbl}>disponibles</span>
            </div>
            <div style={styles.stat}>
              <span style={{
                ...styles.statVal, fontSize: "0.85rem",
                color: activo ? "#22c55e" : "#aaa",
              }}>
                {activo ? "● Activo" : "○ Inactivo"}
              </span>
              <span style={styles.statLbl}>estado</span>
            </div>
          </div>
        </div>

        {/* Zonas */}
        {evento.zonas && evento.zonas.length > 0 && (
          <div style={styles.zonas}>
            {evento.zonas.map((z, i) => (
              <span key={i} style={styles.zonaTag}>
                {z.nombre} · S/{Number(z.precio).toFixed(2)} · {z.disponibles} disp.
              </span>
            ))}
          </div>
        )}

        {/* Acciones */}
        <div style={styles.cardFooter}>
          <button
            onClick={() => onToggle(evento.eventoId, evento.estado)}
            style={{
              ...styles.btnToggle,
              color: activo ? "#f59e0b" : "#22c55e",
              borderColor: activo ? "#f59e0b" : "#22c55e",
            }}
          >
            {activo ? "⏸ Desactivar" : "▶ Activar"}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { background: "#0a0a1a", minHeight: "calc(100vh - 64px)", padding: "2rem" },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    maxWidth: "900px", margin: "0 auto 1.5rem",
  },
  title: { color: "#fff", fontSize: "1.8rem" },
  btnNew: {
    background: "#7c3aed", color: "#fff", border: "none",
    padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
  },
  msg: { textAlign: "center", color: "#aaa", marginTop: "3rem" },
  empty: { textAlign: "center", marginTop: "4rem" },
  emptyIcon: { fontSize: "4rem" },
  emptyText: { color: "#aaa", fontSize: "1.1rem", marginBottom: "1.5rem" },
  btn: {
    background: "#7c3aed", color: "#fff", border: "none", padding: "12px 24px",
    borderRadius: "8px", cursor: "pointer", fontSize: "1rem",
  },
  list: { display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "900px", margin: "0 auto" },
  card: {
    background: "#16213e", borderRadius: "12px",
    overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  },
  catBand: {
    padding: "4px 16px", fontSize: "0.75rem", fontWeight: "bold",
    color: "#fff", textTransform: "capitalize", letterSpacing: "0.05em",
  },
  cardBody: { padding: "1.25rem" },
  cardTop: { display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem" },
  cardInfo: { flex: 1 },
  cardTitle: { color: "#fff", fontSize: "1.1rem", marginBottom: "0.4rem" },
  cardMeta: { color: "#aaa", fontSize: "0.88rem", marginBottom: "0.25rem" },
  cardDesc: { color: "#888", fontSize: "0.82rem", marginTop: "0.4rem" },
  cardStats: {
    display: "flex", gap: "1.5rem", alignItems: "flex-start", flexShrink: 0,
  },
  stat: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
  statVal: { fontWeight: "bold", fontSize: "1rem" },
  statLbl: { color: "#666", fontSize: "0.72rem" },
  zonas: { display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" },
  zonaTag: {
    background: "#0f3460", color: "#a78bfa", border: "1px solid #1a4a8a",
    padding: "3px 10px", borderRadius: "20px", fontSize: "0.78rem",
  },
  cardFooter: { display: "flex", gap: "0.75rem", justifyContent: "flex-end" },
  btnToggle: {
    background: "transparent", border: "1px solid",
    padding: "7px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "0.88rem",
    fontWeight: "600",
  },
}
