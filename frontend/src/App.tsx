import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import SettingsPage from "./pages/SettingsPage";
import SchedulePage from "./pages/SchedulePage"
import LessonsPage from "./pages/LessonsPage"
import PaymentsPage from "./pages/PaymentsPage"
import MaterialsPage from "./pages/MaterialsPage"
import StatisticsPage from "./pages/StatisticsPage"

/* All the app's routes, each page wrapped in ProtectedRoute with the role it needs */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/teacher"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/register"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <RegisterPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/settings"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/schedule-rules"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <SchedulePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/lessons"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <LessonsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/lessons"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <LessonsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/payments"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/payments"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <PaymentsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/materials"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <MaterialsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/materials"
          element={
            <ProtectedRoute requiredRole="STUDENT">
              <MaterialsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/statistics"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <StatisticsPage />
            </ProtectedRoute>
          }
        />

        {/* any unknown path just sends the user back to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;