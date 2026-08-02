import { Routes, Route, Link } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import CreateForm from "./pages/CreateForm";
import FormsList from "./pages/FormsList";
import PublicForm from "./pages/PublicForm";
import Responses from "./pages/Responses";

function App() {
  return (
    <>
      <nav
        style={{
          padding: "15px 25px",
          backgroundColor: "#1976d2",
          marginBottom: "20px",
        }}
      >
        <Link
          to="/"
          style={{
            color: "white",
            textDecoration: "none",
            marginRight: "20px",
            fontWeight: "bold",
          }}
        >
          Dashboard
        </Link>

        <Link
          to="/create-form"
          style={{
            color: "white",
            textDecoration: "none",
            marginRight: "20px",
            fontWeight: "bold",
          }}
        >
          Create Form
        </Link>

        <Link
          to="/forms-list"
          style={{
            color: "white",
            textDecoration: "none",
            fontWeight: "bold",
          }}
        >
          Forms List
        </Link>
        <Link
  to="/responses"
  style={{
    color: "white",
    textDecoration: "none",
    marginLeft: "20px",
    fontWeight: "bold",
  }}
>
  Responses
</Link>
      </nav>

      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<Dashboard />} />

        {/* Create Form */}
        <Route path="/create-form" element={<CreateForm />} />

        {/* Edit Form */}
        <Route path="/edit-form/:id" element={<CreateForm />} />

        {/* Forms List */}
        <Route path="/forms-list" element={<FormsList />} />

        {/* Public Form */}
        <Route path="/form/:id" element={<PublicForm />} />
        <Route path="/responses" element={<Responses />} />
      </Routes>
    </>
  );
}

export default App;