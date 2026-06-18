import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { AdminPage } from './pages/AdminPage'
import { LoginPage } from './pages/LoginPage'
import { PublicComparePage } from './pages/PublicComparePage'
import { isLoggedIn } from './services/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return isLoggedIn() ? children : <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicComparePage />} />
        <Route path="/admin/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}
