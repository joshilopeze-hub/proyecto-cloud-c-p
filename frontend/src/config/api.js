// src/config/api.js
// ── URLs de los microservicios (reemplazar con las URLs reales post-deploy) ──
// Después de ejecutar "serverless deploy" en cada ms, copiar las URLs aquí.

// ── IMPORTANTE: Reemplazar con las URLs reales de AWS después de cada deploy ──
// Obtener URLs con: aws cloudformation describe-stacks --stack-name boletealo-ms-XXX-dev
//   --query "Stacks[0].Outputs[?OutputKey=='HttpApiUrl'].OutputValue" --output text
const API = {
  auth:       import.meta.env.VITE_MS_AUTH_URL       || "https://v3mcdp3bea.execute-api.us-east-1.amazonaws.com",
  eventos:    import.meta.env.VITE_MS_EVENTOS_URL    || "https://kkuok1iccg.execute-api.us-east-1.amazonaws.com",
  tickets:    import.meta.env.VITE_MS_TICKETS_URL    || "https://s5fqc1t2j0.execute-api.us-east-1.amazonaws.com",
  pagos:      import.meta.env.VITE_MS_PAGOS_URL      || "https://qpbrdqcex3.execute-api.us-east-1.amazonaws.com",
  incidentes: import.meta.env.VITE_MS_INCIDENTES_URL || "https://7a8ssnyqof.execute-api.us-east-1.amazonaws.com",
}

// ── Helper para requests autenticados ──
const getHeaders = (withAuth = true) => {
  const headers = { "Content-Type": "application/json" }
  if (withAuth) {
    const token = localStorage.getItem("boletealo_token")
    if (token) headers["Authorization"] = `Bearer ${token}`
  }
  return headers
}

// ── Helper fetch seguro (nunca lanza en JSON parse) ──
const safeFetch = (url, options) =>
  fetch(url, options).then((r) => {
    const ct = r.headers.get("content-type") || ""
    if (ct.includes("application/json")) return r.json()
    return r.text().then((t) => {
      try { return JSON.parse(t) } catch { return { error: `Error HTTP ${r.status}: ${t.slice(0, 200)}` } }
    })
  })

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: (data) =>
    safeFetch(`${API.auth}/auth/register`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify(data),
    }),

  login: (email, password) =>
    safeFetch(`${API.auth}/auth/login`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    safeFetch(`${API.auth}/auth/me`, { headers: getHeaders() }),
}

// ── Eventos ───────────────────────────────────────────────────
export const eventosApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return safeFetch(`${API.eventos}/events${qs ? "?" + qs : ""}`, {
      headers: getHeaders(false),
    })
  },

  get: (eventoId) =>
    safeFetch(`${API.eventos}/events/${eventoId}`, {
      headers: getHeaders(false),
    }),

  create: (data) =>
    safeFetch(`${API.eventos}/events`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }),

  misEventos: () =>
    safeFetch(`${API.eventos}/events/mis-eventos`, {
      headers: getHeaders(),
    }),

  toggle: (eventoId) =>
    safeFetch(`${API.eventos}/events/${eventoId}/toggle`, {
      method: "PATCH",
      headers: getHeaders(),
    }),
}

// ── Tickets ───────────────────────────────────────────────────
export const ticketsApi = {
  buy: (data) =>
    safeFetch(`${API.tickets}/tickets`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }),

  list: () =>
    safeFetch(`${API.tickets}/tickets`, { headers: getHeaders() }),

  get: (ticketId) =>
    safeFetch(`${API.tickets}/tickets/${ticketId}`, {
      headers: getHeaders(),
    }),

  cancel: (ticketId) =>
    safeFetch(`${API.tickets}/tickets/${ticketId}`, {
      method: "DELETE",
      headers: getHeaders(),
    }),
}

// ── Pagos ─────────────────────────────────────────────────────
export const pagosApi = {
  procesar: (data) =>
    safeFetch(`${API.pagos}/pagos/procesar`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }),

  get: (pagoId) =>
    safeFetch(`${API.pagos}/pagos/${pagoId}`, {
      headers: getHeaders(),
    }),
}

// ── Incidentes ────────────────────────────────────────────────
export const incidentesApi = {
  getUploadUrl: (nombreArchivo, contentType) =>
    safeFetch(`${API.incidentes}/incidentes/upload-url`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ nombreArchivo, contentType }),
    }),

  uploadFile: async (file) => {
    const { uploadUrl, s3Key } = await incidentesApi.getUploadUrl(file.name, file.type)
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
    return s3Key
  },

  create: (data) =>
    safeFetch(`${API.incidentes}/incidentes`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }),

  list: () =>
    safeFetch(`${API.incidentes}/incidentes`, { headers: getHeaders() }),

  get: (incidenteId) =>
    safeFetch(`${API.incidentes}/incidentes/${incidenteId}`, {
      headers: getHeaders(),
    }),
}
