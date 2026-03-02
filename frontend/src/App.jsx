import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import Navbar from "./components/Navbar"
import Landing from "./pages/Landing"
import Login from "./pages/Login"
import Registro from "./pages/Registro"
import Eventos from "./pages/Eventos"
import ComprarTicket from "./pages/ComprarTicket"
import MisTickets from "./pages/MisTickets"
import ReportarIncidente from "./pages/ReportarIncidente"
import MisIncidentes from "./pages/MisIncidentes"

function PrivateRoute({ children }) {
  const token = localStorage.getItem("boletealo_token")
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem("boletealo_user")
    if (stored) setUser(JSON.parse(stored))
  }, [])

  const handleLogin = (userData, token) => {
    localStorage.setItem("boletealo_token", token)
    localStorage.setItem("boletealo_user", JSON.stringify(userData))
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem("boletealo_token")
    localStorage.removeItem("boletealo_user")
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/registro" element={<Registro onLogin={handleLogin} />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/comprar/:eventoId" element={<PrivateRoute><ComprarTicket /></PrivateRoute>} />
        <Route path="/mis-tickets" element={<PrivateRoute><MisTickets /></PrivateRoute>} />
        <Route path="/reportar/:ticketId" element={<PrivateRoute><ReportarIncidente /></PrivateRoute>} />
        <Route path="/mis-incidentes" element={<PrivateRoute><MisIncidentes /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
