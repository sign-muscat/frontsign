import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.js';
import MainPage from './pages/MainPage.js';
import GamePage from "./pages/GamePage";
import HandDetection from "./HandDetection";
import ResultPage from "./pages/ResultPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout/>}>
        <Route index element={<MainPage/>}/>
        <Route path="game" element={<GamePage/>}/>
        <Route path="finish" element={<ResultPage/>}/>
        {/*<Route path="hand-detection" element={<HandDetection/>}/>*/}
      </Route>
    </Routes>
  );
}

export default App;
