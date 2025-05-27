import { ThemeProvider, styled } from "styled-components";
import { lightTheme } from "./utils/Themes";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Authentication from "./pages/Authentication";
import { useSelector } from "react-redux";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import WebCamWithErrorBoundary from "./pages/WebCam"; 
import { WorkoutProvider } from "./pages/WorkoutContext";
import Contact from './components/Contact'
const Container = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text_primary};
  overflow-x: hidden;
  overflow-y: hidden;
  transition: all 0.2s ease;
`;

function App() {
  const { currentUser } = useSelector((state) => state.user);

  return (
    <ThemeProvider theme={lightTheme}>
      <WorkoutProvider>
        <BrowserRouter>
          {currentUser ? (
            <Container>
              <Navbar currentUser={currentUser} />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/workouts" element={<Workouts />} />
                <Route path="/webcam" element={<WebCamWithErrorBoundary />} />
                <Route path="/Contact" element={<Contact />} />
              </Routes>
            </Container>
          ) : (
            <Container>
              <Authentication />
            </Container>
          )}
        </BrowserRouter>
      </WorkoutProvider>
    </ThemeProvider>
  );
}

export default App;