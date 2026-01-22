import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/auth/AuthContext";

export default function LoginPage() {
  const { actions } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await actions.login({ email, password });

    setLoading(false);

    if (result.success) {
      window.location.href = "/";
    }
  };

  return (
    <div className="mt-20">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Welcome! <span className="underline text-[#6AC259]">E-COMMERCE</span>
        </h2>
      </div>
      <form
        onSubmit={handleLogin}
        className="max-w-sm min-h-screen mx-auto space-y-4"
      >
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
            Password
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

        <button
          type="submit"
          className="w-full bg-gradient-to-br from-[#2F8D3A] to-[#6AC259] text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg hover:opacity-95 transition cursor-pointer"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        <p className="text-center text-gray-600">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
}
