import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import EditorPage from "./pages/EditorPage";
import "./App.css";
import "@excalidraw/excalidraw/index.css";

// 🛡️ Protected Route component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token"); // Token check kar rahe hain
  return token ? children : <Navigate to="/" />;
};

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{ success: { style: { border: "1px solid #4aed88" } } }}
      />

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />

          {/* 🛡️ Protected Routes: In par bina login nahi ja sakte */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

          <Route
            path="/editor/:roomId"
            element={
              <ProtectedRoute>
                <EditorPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
