import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorHandler from './components/GlobalErrorHandler';
import Layout from './components/Layout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Conversation = lazy(() => import('./pages/Conversation'));

function App() {
  return (
    <ErrorBoundary>
      <GlobalErrorHandler>
        <Router>
          <Layout>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-64">
                  <LoadingSpinner />
                  <span className="ml-2">Loading...</span>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/conversation" element={<Conversation />} />
                <Route path="/conversation/:id" element={<Conversation />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </Router>
      </GlobalErrorHandler>
    </ErrorBoundary>
  );
}

export default App;
