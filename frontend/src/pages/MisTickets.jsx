import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ticketsApi } from "../config/api"

function formatFecha(fecha) {
  if (!fecha) return ""
  const [y, m, d] = fecha.split("-")
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`
}

export default function MisTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    ticketsApi.list()
      .then((res) => setTickets(res.tickets || []))
      .catch(() => setError("No se pudieron cargar tus tickets"))
      .finally(() => setLoading(false))
  }, [])

  const handleCancelar = async (ticketId) => {
    if (!window.confirm("¿Estás seguro de que quieres cancelar este ticket?")) return
    try {
      const res = await ticketsApi.cancel(ticketId)
      if (res.message) {
        setTickets((prev) =>
          prev.map((t) => t.ticket_id === ticketId ? { ...t, estado: "cancelado" } : t)
        )
      } else {
        alert(res.error || "No se pudo cancelar el ticket")
      }
    } catch {
      alert("Error de conexión al cancelar")
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>🎟️ Mis Tickets</h1>
        <button onClick={() => navigate("/eventos")} style={styles.btnNew}>
          + Comprar tickets
        </button>
      </div>

      {loading && <p style={styles.msg}>Cargando tickets...</p>}
      {error && <p style={{ ...styles.msg, color: "#ff6b6b" }}>{error}</p>}
      {!loading && !error && tickets.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyIcon}>🎟️</p>
          <p style={styles.emptyText}>No tienes tickets aún</p>
          <button onClick={() => navigate("/eventos")} style={styles.btn}>Ver eventos</button>
        </div>
      )}

      <div style={styles.list}>
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.ticket_id}
            ticket={ticket}
            navigate={navigate}
            onCancelar={handleCancelar}
          />
        ))}
      </div>
    </div>
  )
}

function TicketCard({ ticket, navigate, onCancelar }) {
  const activo = ticket.estado === "activo"
  const estadoColor = activo ? "#22c55e" : "#aaa"

  return (
    <div style={{ ...styles.card, opacity: activo ? 1 : 0.7 }}>
      <div style={styles.cardLeft}>
        <div style={styles.qrArea}>
          <span style={styles.qrText}>{ticket.qr_code}</span>
          <small style={styles.qrLabel}>QR</small>
        </div>
      </div>
      <div style={styles.cardRight}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>{ticket.evento_nombre}</h3>
          <span style={{ ...styles.estadoBadge, color: estadoColor }}>● {ticket.estado}</span>
        </div>
        <p style={styles.info}>📅 {formatFecha(ticket.evento_fecha)}</p>
        <p style={styles.info}>📍 {ticket.evento_lugar}</p>
        <p style={styles.info}>🪑 Zona: {ticket.zona} · x{ticket.cantidad}</p>
        <div style={styles.cardFooter}>
          <span style={styles.precio}>S/ {Number(ticket.precio_total).toFixed(2)}</span>
          <div style={styles.actions}>
            {activo && (
              <>
                <button
                  onClick={() => navigate(`/reportar/${ticket.ticket_id}`)}
                  style={styles.btnReport}
                >
                  ⚠️ Reportar
                </button>
                <button
                  onClick={() => onCancelar(ticket.ticket_id)}
                  style={styles.btnCancelar}
                >
                  ✕ Cancelar
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { background: "#0a0a1a", minHeight: "calc(100vh - 64px)", padding: "2rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: "900px", margin: "0 auto 1.5rem" },
  title: { color: "#fff", fontSize: "1.8rem" },
  btnNew: {
    background: "#e94560", color: "#fff", border: "none", padding: "10px 20px",
    borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
  },
  msg: { textAlign: "center", color: "#aaa", marginTop: "3rem" },
  empty: { textAlign: "center", marginTop: "4rem" },
  emptyIcon: { fontSize: "4rem" },
  emptyText: { color: "#aaa", fontSize: "1.1rem", marginBottom: "1.5rem" },
  btn: {
    background: "#e94560", color: "#fff", border: "none", padding: "12px 24px",
    borderRadius: "8px", cursor: "pointer", fontSize: "1rem",
  },
  list: { display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "900px", margin: "0 auto" },
  card: {
    background: "#16213e", borderRadius: "12px", display: "flex",
    overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  },
  cardLeft: {
    background: "#0f3460", width: "100px", display: "flex",
    flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "1rem", borderRight: "2px dashed #1a4a8a", flexShrink: 0,
  },
  qrArea: { textAlign: "center" },
  qrText: { display: "block", color: "#e94560", fontSize: "0.7rem", fontWeight: "bold", wordBreak: "break-all" },
  qrLabel: { color: "#aaa", fontSize: "0.75rem" },
  cardRight: { flex: 1, padding: "1.25rem" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" },
  cardTitle: { color: "#fff", fontSize: "1rem", lineHeight: 1.3 },
  estadoBadge: { fontSize: "0.8rem", textTransform: "capitalize", whiteSpace: "nowrap" },
  info: { color: "#aaa", fontSize: "0.88rem", marginBottom: "0.3rem" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" },
  precio: { color: "#e94560", fontWeight: "bold", fontSize: "1.1rem" },
  actions: { display: "flex", gap: "0.5rem" },
  btnReport: {
    background: "transparent", color: "#f59e0b", border: "1px solid #f59e0b",
    padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem",
  },
  btnCancelar: {
    background: "transparent", color: "#ff6b6b", border: "1px solid #ff6b6b",
    padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem",
  },
}
