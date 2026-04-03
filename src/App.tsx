import { Navigate, Route, Routes } from 'react-router-dom';
import ChartDebugPage from './pages/ChartDebugPage';
import CoupleTestPage from './pages/CoupleTestPage';
import GeocodeTestPage from './pages/GeocodeTestPage';
import HomePage from './pages/HomePage';
import ReadingTestPage from './pages/ReadingTestPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      {/* <Route path="/test/chart" element={<ChartDebugPage />} />
      <Route path="/test/reading" element={<ReadingTestPage />} />
      <Route path="/test/couple" element={<CoupleTestPage />} />
      <Route path="/test/geocode" element={<GeocodeTestPage />} /> */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
