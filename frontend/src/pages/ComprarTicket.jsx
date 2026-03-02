import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { eventosApi, ticketsApi, pagosApi } from "../config/api"

const STEPS = ["Evento", "Ticket", "Pago", "Confirmación"]

export default function ComprarTicket() {
  const { eventoId } = useParams()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [evento, setEvento] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Ticket form
  const [zonaSeleccionada, setZonaSeleccionada] = useState(null)
  const [cantidad, setCantidad] = useState(1)

  // Ticket creado
  const [ticket, setTicket] = useState(null)

  // Pago form
  const [metodoPago, setMetodoPago] = useState("tarjeta")
  const [pagoForm, setPagoForm] = useState({
    numero_tarjeta: "", cvv: "", nombre_tarjeta: "",
    numero_yape: "", codigo_yape: "",
  })
  const [procesandoPago, setProcesandoPago] = useState(false)
  const [pagoResult, setPagoResult] = useState(null)

  useEffect(() => {
    eventosApi.get(eventoId)
      .then((res) => {
        // La API devuelve el objeto directamente con campo eventoId
        const ev = res.eventoId ? res : (res.evento || res)
        setEvento(ev)
        const zonas = ev.zonas || []
        if (zonas.length > 0) setZonaSeleccionada(zonas[0])
      })
      .catch(() => setError("No se pudo cargar el evento"))
      .finally(() => setLoading(false))
  }, [eventoId])

  const handleComprarTicket = async () => {
    if (!zonaSeleccionada) return
    setLoading(true)
    try {
      const res = await ticketsApi.buy({
        evento_id: evento.eventoId || evento.evento_id || eventoId,
        evento_nombre: evento.nombre || "",
        evento_fecha: evento.fecha || "",
        evento_lugar: evento.lugar || "",
        zona: zonaSeleccionada.nombre,
        cantidad,
        precio_unit: Number(zonaSeleccionada.precio),
      })
      if (res.ticket) {
        setTicket(res.ticket)
        setStep(2)
      } else {
        setError(res.error || "Error al crear ticket")
      }
    } catch {
      setError("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handlePagar = async () => {
    setProcesandoPago(true)
    setError("")
    try {
      const datos = metodoPago === "tarjeta"
        ? { metodo: "tarjeta", numero_tarjeta: pagoForm.numero_tarjeta, cvv: pagoForm.cvv, nombre_tarjeta: pagoForm.nombre_tarjeta }
        : { metodo: "yape", numero_yape: pagoForm.numero_yape, codigo_yape: pagoForm.codigo_yape }

      const res = await pagosApi.procesar({ ticket_id: ticket.ticket_id, monto: ticket.precio_total, ...datos })
      if (res.pago?.estado === "aprobado") {
        setPagoResult(res.pago)
        setStep(3)
      } else {
        setError(res.error || res.pago?.descripcion_error || "Pago rechazado")
      }
    } catch {
      setError("Error al procesar el pago")
    } finally {
      setProcesandoPago(false)
    }
  }

  if (loading && !evento) return <p style={styles.msg}>Cargando evento...</p>
  if (error && !evento) return <p style={{ ...styles.msg, color: "#ff6b6b" }}>{error}</p>
  if (!evento) return null

  return (
    <div style={styles.page}>
      {/* Stepper */}
      <div style={styles.stepper}>
        {STEPS.map((s, i) => (
          <div key={s} style={styles.stepItem}>
            <div style={{ ...styles.stepCircle, ...(i <= step ? styles.stepActive : {}) }}>{i + 1}</div>
            <span style={{ ...styles.stepLabel, ...(i <= step ? styles.stepLabelActive : {}) }}>{s}</span>
          </div>
        ))}
      </div>

      <div style={styles.container}>
        {/* Step 0: Info evento */}
        {step === 0 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>{evento.nombre}</h2>
            <p style={styles.info}>📅 {evento.fecha}</p>
            <p style={styles.info}>📍 {evento.lugar}, {evento.ciudad}</p>
            <p style={styles.info}>🎤 {evento.artista || evento.descripcion}</p>
            <button onClick={() => setStep(1)} style={styles.btn}>Seleccionar tickets →</button>
          </div>
        )}

        {/* Step 1: Seleccionar zona y cantidad */}
        {step === 1 && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Selecciona tu zona</h2>
            {error && <div style={styles.error}>{error}</div>}
            <div style={styles.zonas}>
              {(evento.zonas || []).map((z) => (
                <div
                  key={z.nombre}
                  onClick={() => setZonaSeleccionada(z)}
                  style={{ ...styles.zonaCard, ...(zonaSeleccionada?.nombre === z.nombre ? styles.zonaActive : {}) }}
                >
                  <strong>{z.nombre}</strong>
                  <span>S/ {Number(z.precio).toFixed(2)}</span>
                  <small>{z.capacidad} disponibles</small>
                </div>
              ))}
            </div>
            <label style={styles.label}>Cantidad de tickets</label>
            <select
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value))}
              style={styles.select}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {zonaSeleccionada && (
              <div style={styles.resumen}>
                <span>Total: </span>
                <strong style={{ color: "#e94560" }}>
                  S/ {(Number(zonaSeleccionada.precio) * cantidad).toFixed(2)}
                </strong>
              </div>
            )}
            <div style={styles.btnRow}>
              <button onClick={() => setStep(0)} style={styles.btnOutline}>← Volver</button>
              <button onClick={handleComprarTicket} disabled={!zonaSeleccionada || loading} style={styles.btn}>
                {loading ? "Procesando..." : "Confirmar →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Pago */}
        {step === 2 && ticket && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Datos de pago</h2>
            <div style={styles.ticketInfo}>
              <span>🎟️ {ticket.evento_nombre} · {ticket.zona} · x{ticket.cantidad}</span>
              <strong style={{ color: "#e94560" }}>S/ {Number(ticket.precio_total).toFixed(2)}</strong>
            </div>
            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.metodosRow}>
              <button
                onClick={() => setMetodoPago("tarjeta")}
                style={{ ...styles.metodoBtn, ...(metodoPago === "tarjeta" ? styles.metodoBtnActive : {}) }}
              >💳 Tarjeta</button>
              <button
                onClick={() => setMetodoPago("yape")}
                style={{ ...styles.metodoBtn, ...(metodoPago === "yape" ? styles.metodoBtnActive : {}) }}
              >📱 Yape</button>
            </div>

            {metodoPago === "tarjeta" && (
              <div style={styles.form}>
                <label style={styles.label}>Número de tarjeta (16 dígitos)</label>
                <input style={styles.input} placeholder="1234 5678 9012 3456" maxLength={16}
                  value={pagoForm.numero_tarjeta}
                  onChange={(e) => setPagoForm({ ...pagoForm, numero_tarjeta: e.target.value.replace(/\D/g, "") })} />
                <label style={styles.label}>Nombre en tarjeta</label>
                <input style={styles.input} placeholder="JUAN PEREZ"
                  value={pagoForm.nombre_tarjeta}
                  onChange={(e) => setPagoForm({ ...pagoForm, nombre_tarjeta: e.target.value })} />
                <label style={styles.label}>CVV</label>
                <input style={styles.input} placeholder="123" maxLength={4}
                  value={pagoForm.cvv}
                  onChange={(e) => setPagoForm({ ...pagoForm, cvv: e.target.value.replace(/\D/g, "") })} />
              </div>
            )}

            {metodoPago === "yape" && (
              <div style={styles.form}>
                <label style={styles.label}>Número de celular Yape</label>
                <input style={styles.input} placeholder="987654321" maxLength={9}
                  value={pagoForm.numero_yape}
                  onChange={(e) => setPagoForm({ ...pagoForm, numero_yape: e.target.value.replace(/\D/g, "") })} />
                <label style={styles.label}>Código de seguridad (6 dígitos)</label>
                <input style={styles.input} placeholder="123456" maxLength={6}
                  value={pagoForm.codigo_yape}
                  onChange={(e) => setPagoForm({ ...pagoForm, codigo_yape: e.target.value.replace(/\D/g, "") })} />
              </div>
            )}

            <div style={styles.btnRow}>
              <button onClick={() => setStep(1)} style={styles.btnOutline}>← Volver</button>
              <button onClick={handlePagar} disabled={procesandoPago} style={styles.btn}>
                {procesandoPago ? "Procesando..." : "Pagar ahora"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmación */}
        {step === 3 && (
          <div style={{ ...styles.card, textAlign: "center" }}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.cardTitle}>¡Compra exitosa!</h2>
            <p style={styles.info}>Tu ticket ha sido emitido. Revisa tu correo electrónico.</p>
            {ticket && (
              <div style={styles.qrBox}>
                <p style={styles.qrLabel}>Código QR</p>
                <p style={styles.qrCode}>{ticket.qr_code}</p>
              </div>
            )}
            <div style={styles.btnRow}>
              <button onClick={() => navigate("/mis-tickets")} style={styles.btn}>Ver mis tickets</button>
              <button onClick={() => navigate("/eventos")} style={styles.btnOutline}>Ver más eventos</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { background: "#0a0a1a", minHeight: "calc(100vh - 64px)", padding: "2rem" },
  msg: { textAlign: "center", color: "#aaa", marginTop: "3rem" },
  stepper: { display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "2rem" },
  stepItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" },
  stepCircle: {
    width: "36px", height: "36px", borderRadius: "50%", background: "#16213e",
    color: "#aaa", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold",
  },
  stepActive: { background: "#e94560", color: "#fff" },
  stepLabel: { color: "#666", fontSize: "0.8rem" },
  stepLabelActive: { color: "#eee" },
  container: { maxWidth: "560px", margin: "0 auto" },
  card: { background: "#16213e", borderRadius: "16px", padding: "2rem", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" },
  cardTitle: { color: "#fff", fontSize: "1.4rem", marginBottom: "1rem" },
  info: { color: "#aaa", marginBottom: "0.5rem", fontSize: "0.95rem" },
  error: { background: "#3d1a1a", color: "#ff6b6b", padding: "10px 14px", borderRadius: "8px", marginBottom: "1rem" },
  zonas: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" },
  zonaCard: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#0f3460", border: "2px solid transparent", borderRadius: "10px",
    padding: "14px 16px", cursor: "pointer", color: "#eee",
  },
  zonaActive: { borderColor: "#e94560" },
  label: { color: "#bbb", fontSize: "0.9rem", display: "block", marginBottom: "0.4rem" },
  select: {
    width: "100%", background: "#0f3460", border: "1px solid #1a4a8a",
    color: "#fff", padding: "10px", borderRadius: "8px", fontSize: "1rem", marginBottom: "1rem",
  },
  resumen: { color: "#eee", marginBottom: "1.5rem", fontSize: "1.1rem" },
  btnRow: { display: "flex", gap: "1rem", marginTop: "1.5rem" },
  btn: {
    flex: 1, background: "#e94560", color: "#fff", border: "none",
    padding: "12px", borderRadius: "8px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer",
  },
  btnOutline: {
    flex: 1, background: "transparent", color: "#e94560",
    border: "2px solid #e94560", padding: "12px", borderRadius: "8px",
    fontSize: "1rem", cursor: "pointer",
  },
  ticketInfo: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#0f3460", borderRadius: "8px", padding: "12px 16px", marginBottom: "1rem", color: "#eee",
  },
  metodosRow: { display: "flex", gap: "1rem", marginBottom: "1.5rem" },
  metodoBtn: {
    flex: 1, background: "#0f3460", color: "#aaa", border: "2px solid transparent",
    padding: "10px", borderRadius: "8px", cursor: "pointer", fontSize: "0.95rem",
  },
  metodoBtnActive: { borderColor: "#e94560", color: "#fff" },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" },
  input: {
    background: "#0f3460", border: "1px solid #1a4a8a", color: "#fff",
    padding: "10px 14px", borderRadius: "8px", fontSize: "1rem", outline: "none",
  },
  successIcon: { fontSize: "4rem", marginBottom: "1rem" },
  qrBox: {
    background: "#0f3460", borderRadius: "12px", padding: "1.5rem",
    margin: "1.5rem 0", textAlign: "center",
  },
  qrLabel: { color: "#aaa", marginBottom: "0.5rem" },
  qrCode: { color: "#e94560", fontSize: "1.3rem", fontWeight: "bold", letterSpacing: "2px" },
}
