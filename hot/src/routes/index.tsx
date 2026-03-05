import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AntRankingPage from '../components/AntRankingPage';
import AIRealtimePage from '../components/AIRealtimePage';
import TopAuthorsPage from '../components/TopAuthorsPage';
import AIProductRankingPage from '../components/AIProductRankingPage';

// 路由配置
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AntRankingPage />} />
      <Route path="/latest" element={<AntRankingPage />} />
      <Route path="/hot" element={<AntRankingPage />} />
      <Route path="/ai-realtime" element={<AIRealtimePage />} />
      <Route path="/top-authors" element={<TopAuthorsPage />} />
      <Route path="/ai-products" element={<AIProductRankingPage />} />
    </Routes>
  );
};

export default AppRoutes; 