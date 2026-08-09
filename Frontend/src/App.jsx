import { Routes, Route, NavLink } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import CreateForm from "./pages/CreateForm";
import FormsList from "./pages/FormsList";
import PublicForm from "./pages/PublicForm";
import ThankYou from "./pages/ThankYou";
import Responses from "./pages/Responses";

function App() {
  const linkClass = ({ isActive }) => (isActive ? "active" : undefined);

  return (
    <>
      <nav>
        <NavLink to="/" end className={linkClass}>Dashboard</NavLink>
        <NavLink to="/create-form" className={linkClass}>Create Form</NavLink>
        <NavLink to="/forms-list" className={linkClass}>Forms List</NavLink>
        <NavLink to="/responses" className={linkClass}>Responses</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create-form" element={<CreateForm />} />
        <Route path="/edit-form/:id" element={<CreateForm />} />
        <Route path="/forms-list" element={<FormsList />} />
        <Route path="/form/:id" element={<PublicForm />} />
        <Route path="/form/:id/thank-you" element={<ThankYou />} />
        <Route path="/responses" element={<Responses />} />
      </Routes>
    </>
  );
}

export default App;
