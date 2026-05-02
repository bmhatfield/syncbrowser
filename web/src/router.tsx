import { createBrowserRouter, Navigate } from 'react-router-dom';

import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Folders } from './pages/Folders';
import { Devices } from './pages/Devices';
import { Browse } from './pages/Browse';
import { FileDetail } from './pages/FileDetail';
import { Needs } from './pages/Needs';

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/folders" replace /> },
      { path: '/folders', element: <Folders /> },
      { path: '/folders/:id/browse/*', element: <Browse /> },
      { path: '/folders/:id/file/*', element: <FileDetail /> },
      { path: '/folders/:id/needs', element: <Needs /> },
      { path: '/devices', element: <Devices /> },
      { path: '*', element: <Navigate to="/folders" replace /> },
    ],
  },
]);
