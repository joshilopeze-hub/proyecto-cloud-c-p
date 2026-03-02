import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { eventosApi } from "../config/api"

const CATEGORIAS = ["Todos", "concierto", "deporte", "teatro", "festival"]

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchParams, setSearchParams] = useSearchParams()
  const categoriaActual = searchParams.get("categoria") || "Todos"

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (categoriaActual && categoriaActual !== "Todos") params.categoria = categoriaActual
    eventosApi.list(params)
      .then((res) => {
        setEventos(res.eventos || [])
        setError("")
      })
      .catch(() => setError("No se pudieron cargar los eventos"))
      .finally(() => setLoading(false))
  }, [categoriaActual])

  const setCategoria = (cat) => {
    if (cat === "Todos") setSearchParams({})
    else setSearchParams({ categoria: cat })
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Eventos disponibles</h1>
        <div style={styles.filtros}>
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              onClick={() => setCategoria(c)}
              style={{ ...styles.filtroBtn, ...(categoriaActual === c || (c === "Todos" && !searchParams.get("categoria")) ? styles.filtroBtnActive : {}) }}
            >
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading && <p style={styles.msg}>Cargando eventos...</p>}
      {error && <p style={{ ...styles.msg, color: "#ff6b6b" }}>{error}</p>}
      {!loading && !error && eventos.length === 0 && (
        <p style={styles.msg}>No hay eventos disponibles en esta categoría.</p>
      )}

      <div style={styles.grid}>
        {eventos.map((evento) => (
          <EventoCard key={evento.eventoId || evento.evento_id} evento={evento} />
        ))}
      </div>
    </div>
  )
}

function formatFecha(fecha) {
  if (!fecha) return ""
  const [y, m, d] = fecha.split("-")
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
  return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`
}

function EventoCard({ evento }) {
  const zonas = evento.zonas || []
  const precioMin = zonas.length
    ? Math.min(...zonas.map((z) => Number(z.precio)))
    : evento.precio || 0
  const totalDisponibles = zonas.reduce((acc, z) => acc + (Number(z.disponibles) || 0), 0)

  const categoriaEmoji = { concierto:"🎵", deporte:"⚽", teatro:"🎭", festival:"🎪" }[evento.categoria] || "🎟️"
  const categoriaBg    = { concierto:"#3d1a4a", deporte:"#1a3a1a", teatro:"#2a1a3a", festival:"#3a2a0a" }[evento.categoria] || "#0f3460"

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardBanner, background: categoriaBg }}>
        <span style={styles.catBadge}>{categoriaEmoji} {evento.categoria}</span>
        {totalDisponibles > 0 && (
          <span style={totalDisponibles < 50 ? styles.disponiblesBajo : styles.disponibles}>
            {totalDisponibles.toLocaleString()} entradas disponibles
          </span>
        )}
      </div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{evento.nombre}</h3>
        <p style={styles.cardInfo}>📅 {formatFecha(evento.fecha)} · {evento.hora}</p>
        <p style={styles.cardInfo}>📍 {evento.lugar}, {evento.ciudad}</p>
        <p style={styles.cardInfo}>🎤 {evento.artista || evento.descripcion}</p>
        <div style={styles.cardFooter}>
          <span style={styles.precio}>Desde S/ {Number(precioMin).toFixed(2)}</span>
          <Link to={`/comprar/${evento.eventoId || evento.evento_id}`} style={styles.btnComprar}>
            Comprar
          </Link>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { background: "#0a0a1a", minHeight: "calc(100vh - 64px)", padding: "2rem" },
  header: { maxWidth: "1100px", margin: "0 auto 2rem" },
  title: { color: "#fff", fontSize: "1.8rem", marginBottom: "1rem" },
  filtros: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  filtroBtn: {
    background: "#16213e", color: "#aaa", border: "1px solid #0f3460",
    padding: "6px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "0.9rem",
  },
  filtroBtnActive: { background: "#e94560", color: "#fff", border: "1px solid #e94560" },
  msg: { textAlign: "center", color: "#aaa", marginTop: "3rem", fontSize: "1.1rem" },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem", maxWidth: "1100px", margin: "0 auto",
  },
  card: { background: "#16213e", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.3)" },
  cardBanner: { padding: "0.75rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" },
  catBadge: { color: "#e94560", fontSize: "0.85rem", fontWeight: "bold", textTransform: "capitalize" },
  disponibles: { color: "#22c55e", fontSize: "0.78rem", fontWeight: "bold" },
  disponiblesBajo: { color: "#f59e0b", fontSize: "0.78rem", fontWeight: "bold" },
  cardBody: { padding: "1.25rem" },
  cardTitle: { color: "#fff", fontSize: "1.1rem", marginBottom: "0.75rem", lineHeight: 1.3 },
  cardInfo: { color: "#aaa", fontSize: "0.88rem", marginBottom: "0.4rem" },
  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" },
  precio: { color: "#e94560", fontWeight: "bold", fontSize: "1.1rem" },
  btnComprar: {
    background: "#e94560", color: "#fff", padding: "8px 18px",
    borderRadius: "8px", textDecoration: "none", fontSize: "0.9rem", fontWeight: "bold",
  },
}
