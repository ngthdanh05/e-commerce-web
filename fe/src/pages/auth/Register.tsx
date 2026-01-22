import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../context/auth/AuthContext";

export default function RegisterPage() {
  const { actions } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Mật khẩu không khớp!");
      return;
    }

    setLoading(true);
    const result = await actions.register({
      name,
      email,
      password,
      confirmPassword,
    });

    console.log(result);
    setLoading(false);

    if (result.success) {
      navigate("/login");
    }

    // Reset form
    setEmail("");
    setName("");
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <form
      onSubmit={handleRegister}
      className="max-w-sm min-h-screen mx-auto mt-20 space-y-4"
    >
      <h2 className="text-3xl font-bold text-center text-gray-800">
        Đăng ký tài khoản
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Họ và tên
        </label>
        <input
          type="text"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nguyen Van A"
          autoComplete="current-name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          type="email"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="current-email"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mật khẩu
        </label>
        <input
          type="password"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Xác nhận mật khẩu
        </label>
        <input
          type="password"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-to-br from-[#2F8D3A] to-[#6AC259] text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg hover:opacity-95 transition cursor-pointer"
      >
        {loading ? "Đang đăng ky..." : "Đăng ký"}
      </button>

      <p className="text-center text-gray-600">
        Đã có tài khoản?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
