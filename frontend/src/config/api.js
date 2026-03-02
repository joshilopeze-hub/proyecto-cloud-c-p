// src/config/api.js
// ── URLs de los microservicios (reemplazar con las URLs reales post-deploy) ──
// Después de ejecutar "serverless deploy" en cada ms, copiar las URLs aquí.

const API = {
  auth:       import.meta.env.VITE_MS_AUTH_URL      || "https://XXXXXXXX.execute-api.us-east-1.amazonaws.com",
  eventos:    import.meta.env.VITE_MS_EVENTOS_URL   || "https://XXXXXXXX.execute-api.us-east-1.amazonaws.com",
  tickets:    import.meta.env.VITE_MS_TICKETS_URL   || "https://XXXXXXXX.execute-api.us-east-1.amazonaws.com",
  pagos:      import.meta.env.VITE_MS_PAGOS_URL     || "https://XXXXXXXX.execute-api.us-east-1.amazonaws.com",
  incidentes: import.meta.env.VITE_MS_INCIDENTES_URL|| "https://XXXXXXXX.execute-api.us-east-1.amazonaws.com",
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

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  register: (data) =>
    fetch(`${API.auth}/auth/register`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  login: (email, password) =>
    fetch(`${API.auth}/auth/login`, {
      method: "POST",
      headers: getHeaders(false),
      body: JSON.stringify({ email, password }),
    }).then((r) => r.json()),

  me: () =>
    fetch(`${API.auth}/auth/me`, { headers: getHeaders() }).then((r) => r.json()),
}

// ── Eventos ───────────────────────────────────────────────────
export const eventosApi = {
  list: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return fetch(`${API.eventos}/events${qs ? "?" + qs : ""}`, {
      headers: getHeaders(false),
    }).then((r) => r.json())
  },

  get: (eventoId) =>
    fetch(`${API.eventos}/events/${eventoId}`, {
      headers: getHeaders(false),
    }).then((r) => r.json()),
}

// ── Tickets ───────────────────────────────────────────────────
export const ticketsApi = {
  buy: (data) =>
    fetch(`${API.tickets}/tickets`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  list: () =>
    fetch(`${API.tickets}/tickets`, { headers: getHeaders() }).then((r) => r.json()),

  get: (ticketId) =>
    fetch(`${API.tickets}/tickets/${ticketId}`, {
      headers: getHeaders(),
    }).then((r) => r.json()),
}

// ── Pagos ─────────────────────────────────────────────────────
export const pagosApi = {
  procesar: (data) =>
    fetch(`${API.pagos}/pagos/procesar`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  get: (pagoId) =>
    fetch(`${API.pagos}/pagos/${pagoId}`, {
      headers: getHeaders(),
    }).then((r) => r.json()),
}

// ── Incidentes ────────────────────────────────────────────────
export const incidentesApi = {
  getUploadUrl: (nombreArchivo, contentType) =>
    fetch(`${API.incidentes}/incidentes/upload-url`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ nombreArchivo, contentType }),
    }).then((r) => r.json()),

  uploadFile: async (file) => {
    const { uploadUrl, s3Key } = await incidentesApi.getUploadUrl(file.name, file.type)
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } })
    return s3Key
  },

  create: (data) =>
    fetch(`${API.incidentes}/incidentes`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  list: () =>
    fetch(`${API.incidentes}/incidentes`, { headers: getHeaders() }).then((r) => r.json()),

  get: (incidenteId) =>
    fetch(`${API.incidentes}/incidentes/${incidenteId}`, {
      headers: getHeaders(),
    }).then((r) => r.json()),
}
