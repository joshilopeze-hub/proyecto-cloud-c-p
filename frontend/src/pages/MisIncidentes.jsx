import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { incidentesApi } from "../config/api"

const ESTADO_COLOR = {
  abierto: "#e94560",
  en_revision: "#f59e0b",
  resuelto: "#22c55e",
  cerrado: "#666",
}

const TIPO_LABEL = {
  qr_no_reconocido: "QR no reconocido",
  asiento_ocupado: "Asiento ocupado",
  evento_cancelado: "Evento cancelado",
  no_ingreso: "No dejaron ingresar",
  otro: "Otro",
}

export default function MisIncidentes() {
  const [incidentes, setIncidentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [seleccionado, setSeleccionado] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    incidentesApi.list()
      .then((res) => setIncidentes(res.incidentes || []))
      .catch(() => setError("No se pudieron cargar los incidentes"))
      .finally(() => setLoading(false))
  }, [])

  const verDetalle = async (id) => {
    try {
      const res = await incidentesApi.get(id)
      setSeleccionado(res.incidente || res)
    } catch {
      setError("No se pudo cargar el detalle")
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.layout}>
        {/* Lista */}
        <div style={styles.lista}>
          <h1 style={styles.title}>⚠️ Mis Incidentes</h1>
          {loading && <p style={styles.msg}>Cargando...</p>}
          {error && <p style={{ ...styles.msg, color: "#ff6b6b" }}>{error}</p>}
          {!loading && !error && incidentes.length === 0 && (
            <div style={styles.empty}>
              <p style={styles.emptyIcon}>✅</p>
              <p style={styles.emptyText}>No tienes incidentes reportados</p>
              <button onClick={() => navigate("/mis-tickets")} style={styles.btn}>Ver mis tickets</button>
            </div>
          )}
          {incidentes.map((inc) => (
            <div
              key={inc.incidenteId}
              onClick={() => verDetalle(inc.incidenteId)}
              style={{ ...styles.incCard, ...(seleccionado?.incidenteId === inc.incidenteId ? styles.incCardActive : {}) }}
            >
              <div style={styles.incHeader}>
                <span style={styles.incTipo}>{TIPO_LABEL[inc.tipoProblema] || inc.tipoProblema}</span>
                <span style={{ ...styles.incEstado, color: ESTADO_COLOR[inc.estado] || "#aaa" }}>
                  ● {inc.estado?.replace("_", " ")}
                </span>
              </div>
              <p style={styles.incDesc}>{inc.descripcion?.slice(0, 80)}...</p>
              <small style={styles.incFecha}>
                {inc.createdAt ? new Date(inc.createdAt).toLocaleDateString("es-PE") : "—"}
              </small>
            </div>
          ))}
        </div>

        {/* Detalle */}
        {seleccionado && (
          <div style={styles.detalle}>
            <div style={styles.detalleHeader}>
              <h2 style={styles.detalleTitle}>Detalle del incidente</h2>
              <button onClick={() => setSeleccionado(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.detalleField}>
              <label style={styles.detalleLabel}>Tipo</label>
              <p style={styles.detalleValue}>{TIPO_LABEL[seleccionado.tipoProblema] || seleccionado.tipoProblema}</p>
            </div>
            <div style={styles.detalleField}>
              <label style={styles.detalleLabel}>Estado</label>
              <span style={{ ...styles.estadoBadge, background: ESTADO_COLOR[seleccionado.estado] || "#666" }}>
                {seleccionado.estado?.replace("_", " ")}
              </span>
            </div>
            <div style={styles.detalleField}>
              <label style={styles.detalleLabel}>Ticket</label>
              <p style={{ ...styles.detalleValue, color: "#e94560" }}>{seleccionado.ticketId}</p>
            </div>
            <div style={styles.detalleField}>
              <label style={styles.detalleLabel}>Descripción</label>
              <p style={{ ...styles.detalleValue, lineHeight: 1.6 }}>{seleccionado.descripcion}</p>
            </div>
            <div style={styles.detalleField}>
              <label style={styles.detalleLabel}>Fecha de reporte</label>
              <p style={styles.detalleValue}>
                {seleccionado.createdAt ? new Date(seleccionado.createdAt).toLocaleString("es-PE") : "—"}
              </p>
            </div>
            {seleccionado.evidencias?.length > 0 && (
              <div style={styles.detalleField}>
                <label style={styles.detalleLabel}>Evidencias</label>
                {seleccionado.evidencias.map((ev, i) => (
                  <p key={i} style={{ ...styles.detalleValue, color: "#60a5fa" }}>📎 {ev.nombre || ev.s3Key}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { background: "#0a0a1a", minHeight: "calc(100vh - 64px)", padding: "2rem" },
  layout: { display: "flex", gap: "1.5rem", maxWidth: "1100px", margin: "0 auto", alignItems: "flex-start" },
  lista: { flex: 1, minWidth: 0 },
  title: { color: "#fff", fontSize: "1.8rem", marginBottom: "1.5rem" },
  msg: { textAlign: "center", color: "#aaa", marginTop: "2rem" },
  empty: { textAlign: "center", marginTop: "3rem" },
  emptyIcon: { fontSize: "3rem" },
  emptyText: { color: "#aaa", marginBottom: "1rem" },
  btn: { background: "#e94560", color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" },
  incCard: {
    background: "#16213e", borderRadius: "10px", padding: "1rem 1.25rem",
    marginBottom: "0.75rem", cursor: "pointer", border: "2px solid transparent",
    transition: "border-color 0.2s",
  },
  incCardActive: { borderColor: "#e94560" },
  incHeader: { display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" },
  incTipo: { color: "#fff", fontWeight: "bold", fontSize: "0.95rem" },
  incEstado: { fontSize: "0.85rem", textTransform: "capitalize" },
  incDesc: { color: "#aaa", fontSize: "0.88rem", marginBottom: "0.5rem" },
  incFecha: { color: "#555", fontSize: "0.8rem" },
  detalle: {
    width: "360px", background: "#16213e", borderRadius: "12px",
    padding: "1.5rem", boxShadow: "0 8px 32px rgba(0,0,0,0.3)", flexShrink: 0,
  },
  detalleHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  detalleTitle: { color: "#fff", fontSize: "1.1rem" },
  closeBtn: { background: "none", border: "none", color: "#aaa", fontSize: "1.2rem", cursor: "pointer" },
  detalleField: { marginBottom: "1.25rem" },
  detalleLabel: { color: "#666", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "0.3rem" },
  detalleValue: { color: "#eee", fontSize: "0.95rem", margin: 0 },
  estadoBadge: {
    display: "inline-block", padding: "3px 10px", borderRadius: "20px",
    color: "#fff", fontSize: "0.8rem", textTransform: "capitalize",
  },
}
