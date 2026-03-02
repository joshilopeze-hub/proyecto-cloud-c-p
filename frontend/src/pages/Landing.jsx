import { Link } from "react-router-dom"

export default function Landing() {
  return (
    <div style={styles.page}>
      {/* Hero */}
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>Tu ticket, tu experiencia</h1>
          <p style={styles.heroSub}>
            Compra tickets para conciertos, eventos deportivos, teatro y más.
            Rápido, seguro y desde cualquier lugar.
          </p>
          <div style={styles.heroButtons}>
            <Link to="/eventos" style={styles.btnPrimary}>Ver Eventos</Link>
            <Link to="/registro" style={styles.btnSecondary}>Crear Cuenta</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={styles.features}>
        <h2 style={styles.sectionTitle}>¿Por qué Boletealo?</h2>
        <div style={styles.cards}>
          {[
            { icon: "⚡", title: "Compra instantánea", desc: "Adquiere tu ticket en segundos, sin filas ni esperas." },
            { icon: "🔒", title: "Pago seguro", desc: "Acepta tarjetas y Yape. Tus datos nunca se almacenan." },
            { icon: "📱", title: "QR digital", desc: "Recibe tu QR por email y úsalo directamente desde tu celular." },
            { icon: "🛡️", title: "Soporte 24/7", desc: "Reporta cualquier inconveniente y lo atendemos de inmediato." },
          ].map((f) => (
            <div key={f.title} style={styles.card}>
              <div style={styles.cardIcon}>{f.icon}</div>
              <h3 style={styles.cardTitle}>{f.title}</h3>
              <p style={styles.cardDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categorías */}
      <section style={styles.categories}>
        <h2 style={styles.sectionTitle}>Explora por categoría</h2>
        <div style={styles.catGrid}>
          {[
            { icon: "🎵", label: "Conciertos" },
            { icon: "⚽", label: "Deportes" },
            { icon: "🎭", label: "Teatro" },
            { icon: "🎪", label: "Festivales" },
          ].map((c) => (
            <Link to={`/eventos?categoria=${c.label.toLowerCase()}`} key={c.label} style={styles.catCard}>
              <span style={styles.catIcon}>{c.icon}</span>
              <span style={styles.catLabel}>{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={styles.cta}>
        <h2 style={styles.ctaTitle}>¿Listo para vivir la experiencia?</h2>
        <Link to="/eventos" style={styles.btnPrimary}>Explorar eventos</Link>
      </section>

      <footer style={styles.footer}>
        <p>© 2024 Boletealo · Hecho en Perú 🇵🇪</p>
      </footer>
    </div>
  )
}

const styles = {
  page: { fontFamily: "sans-serif", color: "#eee", background: "#0a0a1a", minHeight: "100vh" },
  hero: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    padding: "6rem 2rem",
    textAlign: "center",
  },
  heroContent: { maxWidth: "700px", margin: "0 auto" },
  heroTitle: { fontSize: "3rem", fontWeight: "bold", color: "#fff", marginBottom: "1rem" },
  heroSub: { fontSize: "1.2rem", color: "#bbb", marginBottom: "2rem", lineHeight: 1.6 },
  heroButtons: { display: "flex", gap: "1rem", justifyContent: "center" },
  btnPrimary: {
    background: "#e94560", color: "#fff", padding: "14px 32px",
    borderRadius: "8px", textDecoration: "none", fontWeight: "bold", fontSize: "1rem",
  },
  btnSecondary: {
    background: "transparent", color: "#e94560", padding: "14px 32px",
    borderRadius: "8px", textDecoration: "none", fontWeight: "bold", fontSize: "1rem",
    border: "2px solid #e94560",
  },
  features: { padding: "4rem 2rem", maxWidth: "1100px", margin: "0 auto" },
  sectionTitle: { textAlign: "center", fontSize: "1.8rem", marginBottom: "2.5rem", color: "#fff" },
  cards: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" },
  card: { background: "#16213e", borderRadius: "12px", padding: "2rem", textAlign: "center" },
  cardIcon: { fontSize: "2.5rem", marginBottom: "1rem" },
  cardTitle: { fontSize: "1.1rem", fontWeight: "bold", color: "#fff", marginBottom: "0.5rem" },
  cardDesc: { color: "#aaa", fontSize: "0.9rem", lineHeight: 1.5 },
  categories: { padding: "3rem 2rem", maxWidth: "900px", margin: "0 auto" },
  catGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" },
  catCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem",
    background: "#16213e", borderRadius: "12px", padding: "2rem 1rem",
    textDecoration: "none", transition: "transform 0.2s",
  },
  catIcon: { fontSize: "2.5rem" },
  catLabel: { color: "#eee", fontWeight: "bold" },
  cta: { textAlign: "center", padding: "4rem 2rem", background: "#16213e" },
  ctaTitle: { fontSize: "1.8rem", color: "#fff", marginBottom: "1.5rem" },
  footer: { textAlign: "center", padding: "2rem", color: "#555", fontSize: "0.85rem" },
}
