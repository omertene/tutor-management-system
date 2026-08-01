import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import RegisterPage from "./pages/RegisterPage";
import ProtectedRoute from "./components/ProtectedRoute";
import SubjectsPage from "./pages/SubjectsPage";
import ScheduleRulePage from "./pages/ScheduleRulePage"
import ScheduleOverridePage from "./pages/ScheduleOverridePage"

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
          path="/teacher/subjects"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <SubjectsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/schedule-rules"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <ScheduleRulePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/schedule-overrides"
          element={
            <ProtectedRoute requiredRole="TEACHER">
              <ScheduleOverridePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;