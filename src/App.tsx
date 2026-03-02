import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Inventory from './pages/Inventory';
import AddProduct from './pages/AddProduct';
import ShippingCompanies from './pages/ShippingCompanies';
import AddShippingCompany from './pages/AddShippingCompany';
import Orders from './pages/Orders';
import AddOrder from './pages/AddOrder';
import OrderInvoice from './pages/OrderInvoice';
import PrintBulk from './pages/PrintBulk';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, pageName }: { children: React.ReactNode, pageName?: string }) => {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (pageName && !hasPermission(pageName)) {
    if (user?.role === 'admin') return <Navigate to="/" />;
    const firstPerm = user?.permissions?.[0];
    const target = firstPerm === 'home' ? '/' : (firstPerm ? `/${firstPerm}` : '/login');
    return <Navigate to={target} />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<ProtectedRoute pageName="home"><Home /></ProtectedRoute>} />
            <Route path="orders" element={<ProtectedRoute pageName="orders"><Orders /></ProtectedRoute>} />
            <Route path="orders/add" element={<ProtectedRoute pageName="orders"><AddOrder /></ProtectedRoute>} />
            <Route path="orders/invoice/:id" element={<ProtectedRoute pageName="orders"><OrderInvoice /></ProtectedRoute>} />
            <Route path="orders/print-bulk" element={<ProtectedRoute pageName="orders"><PrintBulk /></ProtectedRoute>} />
            <Route path="inventory" element={<ProtectedRoute pageName="inventory"><Inventory /></ProtectedRoute>} />
            <Route path="inventory/add" element={<ProtectedRoute pageName="inventory"><AddProduct /></ProtectedRoute>} />
            <Route path="shipping" element={<ProtectedRoute pageName="shipping"><ShippingCompanies /></ProtectedRoute>} />
            <Route path="shipping/add" element={<ProtectedRoute pageName="shipping"><AddShippingCompany /></ProtectedRoute>} />
            <Route path="shipping/edit/:id" element={<ProtectedRoute pageName="shipping"><AddShippingCompany /></ProtectedRoute>} />
            <Route path="suppliers" element={<ProtectedRoute pageName="suppliers"><Suppliers /></ProtectedRoute>} />
            <Route path="expenses" element={<ProtectedRoute pageName="expenses"><Expenses /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute pageName="settings"><Settings /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
