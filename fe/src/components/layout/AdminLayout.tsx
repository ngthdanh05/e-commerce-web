import AdminSidebar from "./SideBar/AdminSidebar";
import { Outlet, useLocation } from "react-router-dom";

export default function AdminLayout() {
  const location = useLocation();

  const getCurrentLabel = (pathname: string) => {
    if (pathname === "/admin/categories") return "QUẢN LÝ DANH MỤC";
    if (pathname === "/admin/products") return "QUẢN LÝ SẢN PHẨM";
    if (pathname === "/admin/users") return "QUẢN LÝ NGƯỜI DÙNG";
    if (pathname === "/admin/orders") return "QUẢN LÝ ĐƠN HÀNG";

    return "THỐNG KÊ & BÁO CÁO";
  };

  const currentLabel = getCurrentLabel(location.pathname);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <h1 className="ml-6 text-xl font-bold">{currentLabel}</h1>
        <Outlet />
      </main>
    </div>
  );
}
