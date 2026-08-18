import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginForAdmin from "./pages/admin/LoginForAdmin";
import DashBoard from "./pages/admin/DashBoard";
import CategoryManagement from "./pages/admin/CategoryManagement";
import ProductManagement from "./pages/admin/ProductManagement";
import UsersManagement from "./pages/admin/UsersManagement";
import OrdersManagement from "./pages/admin/OrdersManagement";
import MainLayout from "./components/layout/MainLayout";
import Home from "./pages/home/Home";
import ProductDetailPage from "./pages/product/ProductDetailPage";
import Cart from "./pages/product/Cart";
import Checkout from "./pages/product/CheckOut";
import CheckoutSuccess from "./pages/product/CheckoutSuccess";
import CheckoutFailure from "./pages/product/CheckoutFailure";
import MemberLayout from "./components/layout/MemberLayout";
import Profile from "./pages/member/Profile";
import TransactionHistory from "./pages/member/TransactionHistory";
import OrderDetail from "./pages/member/OrderDetail";
import LoginPage from "./pages/auth/Login";
import RegisterPage from "./pages/auth/Register";
import AdminLayout from "./components/layout/AdminLayout";
import ProductReview from "./pages/member/ProductReview";
import WriteReview from "./pages/member/WriteReview";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/checkout-failure" element={<CheckoutFailure />} />
          <Route path="/account" element={<MemberLayout />}>
            <Route index element={<Profile />} />
            <Route path="transactionHistory" element={<TransactionHistory />} />
            <Route path="transactionHistory/:id" element={<OrderDetail />} />
            <Route path="productReview" element={<ProductReview />} />
            <Route path="productReview/:id" element={<WriteReview />} />
          </Route>
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/login" element={<LoginForAdmin />} />

        {/* Bỏ ProtectedRoute để vào thẳng giao diện Admin test Jira */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashBoard />} />
          <Route path="categories" element={<CategoryManagement />} />
          <Route path="products" element={<ProductManagement />} />
          <Route path="users" element={<UsersManagement />} />
          <Route path="orders" element={<OrdersManagement />} />
        </Route>
      </Routes>
    </Router>
  );
}