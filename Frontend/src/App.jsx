import { Routes, Route } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateForm from "./pages/CreateForm";
import FormsList from "./pages/FormsList";
import PublicForm from "./pages/PublicForm";
import ThankYou from "./pages/ThankYou";
import Responses from "./pages/Responses";

function App() {
  return (
    <Routes>
      {/* Public, unauthenticated routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/form/:id" element={<PublicForm />} />
      <Route path="/form/:id/thank-you" element={<ThankYou />} />

      {/* Admin/dashboard routes (auth required) */}
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/create-form" element={<CreateForm />} />
        <Route path="/edit-form/:id" element={<CreateForm />} />
        <Route path="/forms-list" element={<FormsList />} />
        <Route path="/responses" element={<Responses />} />
      </Route>
    </Routes>
  );
}

export default App;