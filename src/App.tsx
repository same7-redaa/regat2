import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import Settings from './pages/Settings';
import Expenses from './pages/Expenses';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/add" element={<AddOrder />} />
          <Route path="orders/invoice/:id" element={<OrderInvoice />} />
          <Route path="orders/print-bulk" element={<PrintBulk />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="inventory/add" element={<AddProduct />} />
          <Route path="shipping" element={<ShippingCompanies />} />
          <Route path="shipping/add" element={<AddShippingCompany />} />
          <Route path="shipping/edit/:id" element={<AddShippingCompany />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
