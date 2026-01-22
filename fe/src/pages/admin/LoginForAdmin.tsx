import axios from "axios";
import { useState } from "react";
import { useAuth } from "../../context/auth/AuthContext";

axios.defaults.withCredentials = true;
export default function LoginForAdmin() {
  const { actions } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await actions.login({ email, password });
      if (result.success) {
        window.location.href = "/admin";
      } else {
        setError(result.message || "Đăng nhập thất bại");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Lỗi kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2F8D3A] to-[#6AC259] z-0"></div>
        <div className="relative z-10 text-center text-white px-10 max-w-lg space-y-4">
          <h1 className="text-5xl font-extrabold leading-tight drop-shadow-lg">
            Hello ADMIN! 👋
          </h1>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm text-center">{error}</p>}

      <div className="flex w-full md:w-1/2 justify-center items-center px-6 md:px-10 bg-white">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10 space-y-8 border border-gray-100">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Welcome Admin!
              <br />
              <span className="underline text-[#6AC259]">E-COMMERCE</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-br from-[#2F8D3A] to-[#6AC259] text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg hover:opacity-95 transition cursor-pointer"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
