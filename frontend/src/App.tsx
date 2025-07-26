import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalErrorHandler from './components/GlobalErrorHandler';
import Layout from './components/Layout';
import Home from './pages/Home';
import Conversation from './pages/Conversation';

function App() {
  return (
    <ErrorBoundary>
      <GlobalErrorHandler>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/conversation" element={<Conversation />} />
              <Route path="/conversation/:id" element={<Conversation />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </GlobalErrorHandler>
    </ErrorBoundary>
  );
}

export default App;
