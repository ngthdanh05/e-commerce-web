import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCartShopping,
  faFolder,
  faHouse,
  faPlus,
  faSignOutAlt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../../context/auth/AuthContext";

const menuItems = [
  {
    id: 0,
    label: "Dashboard",
    to: ".",
    icon: faHouse,
  },
  {
    id: 1,
    label: "Quản lý danh mục",
    to: "categories",
    icon: faFolder,
  },
  {
    id: 2,
    label: "Quản lý sản phẩm",
    to: "products",
    icon: faPlus,
  },
  {
    id: 3,
    label: "Quản lý người dùng",
    to: "users",
    icon: faUser,
  },
  {
    id: 4,
    label: "Quản lý đơn hàng",
    to: "orders",
    icon: faCartShopping,
  },
];

export default function AdminSidebar() {
  const { actions } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await actions.logout();
    navigate("/", { replace: true });
  };

  return (
    <aside className="w-72 h-screen flex flex-col bg-white rounded-2xl border shadow-lg p-5">
      <div className="flex flex-col items-center gap-3 mb-6">
        <img
          src="/logo.png"
          alt="Logo"
          className="w-16 h-16 rounded-full object-cover border border-gray-200"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b pb-2 mb-3">
          Main Menu
        </h2>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "."}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-100 text-blue-700 font-semibold shadow-sm"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                }`
              }
            >
              <FontAwesomeIcon icon={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t pt-4 mt-auto">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-4 w-full text-left rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition"
        >
          <FontAwesomeIcon icon={faSignOutAlt} />
          <span className="font-medium">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
