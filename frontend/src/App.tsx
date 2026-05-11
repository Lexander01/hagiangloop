import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing         from './pages/Landing'
import Booking         from './pages/Booking'
import BookingSuccess  from './pages/BookingSuccess'
import GuideLogin      from './pages/GuideLogin'
import GuideDashboard  from './pages/GuideDashboard'
import ProtectedRoute  from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer routes */}
        <Route path="/"               element={<Landing />} />
        <Route path="/book"           element={<Booking />} />
        <Route path="/booking/success"   element={<BookingSuccess />} />
        {/* Guide routes */}
        <Route path="/guide/login"     element={<GuideLogin />} />
        <Route
          path="/guide/dashboard"
          element={
            <ProtectedRoute>
              <GuideDashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
