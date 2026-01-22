import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import { useUserProfile } from "../../../hooks/useUserProfile";
import { useAuth } from "../../../context/auth/AuthContext";

const menuItems = [
  { id: 0, label: "THÔNG TIN CÁ NHÂN", to: "." },
  { id: 1, label: "LỊCH SỬ GIAO DỊCH", to: "transactionHistory" },
  { id: 2, label: "ĐÁNH GIÁ SẢN PHẨM", to: "productReview" },
];

export default function AccountSidebar() {
  const { avatar, setAvatar } = useUserProfile();

  const { user } = useAuth();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setAvatar(reader.result.toString());
        localStorage.setItem("userAvatar", reader.result.toString());
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => {
    document.getElementById("avatarInput")?.click();
  };

  return (
    <div className="p-4 w-full border-r bg-white rounded-xl shadow-sm">
      <div className="flex flex-col items-center relative">
        <div
          className="relative w-24 h-24 bg-gray-100 rounded-full mb-3 flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition"
          onClick={handleAvatarClick}
        >
          {avatar ? (
            <img
              src={avatar}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-12 h-12 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2c-3.2 0-9.5 1.6-9.5 4.9V22h19v-3.1c0-3.3-6.3-4.9-9.5-4.9z" />
            </svg>
          )}
        </div>
        <button
          onClick={handleAvatarClick}
          className="absolute hidden md:flex md:bottom-[60px] md:right-[60px] lg:bottom-16 lg:right-16 -translate-x-0 -translate-y-0 bg-white border border-gray-300 rounded-full p-1 text-gray-600 hover:bg-gray-50 shadow-sm"
        >
          <FontAwesomeIcon icon={faCamera} size="lg" />
        </button>

        <input
          type="file"
          id="avatarInput"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <h3 className="text-lg font-semibold text-gray-800">
          {user?.name || "User Name"}
        </h3>
        <span className="text-sm text-gray-600 mt-1">
          {user?.email || "example@student.ut.edu.vn"}
        </span>
      </div>

      <nav className="mt-6 space-y-3 font-medium text-gray-700">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            end={item.to === "."}
            className={({ isActive }) =>
              `block border-b pb-2 transition ${
                isActive
                  ? "text-blue-600 border-blue-300 font-semibold"
                  : "text-gray-600 hover:text-blue-500"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
