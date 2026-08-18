import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/auth/AuthContext";
import InputError from "../../InputError";

// Regex RFC 5322 kiểm tra Email
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 1. Validation Schema (Email >= 5 ký tự, Password >= 8 ký tự theo đúng DoD)
const loginSchema = z.object({
  email: z
    .string()
    .min(5, "Email phải có ít nhất 5 ký tự")
    .regex(emailRegex, "Email không đúng định dạng"),
  password: z
    .string()
    .min(8, "Mật khẩu phải từ 8 ký tự trở lên"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { actions } = useAuth();

  // 2. React Hook Form với chế độ validate onBlur
  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  // 3. Submit và hứng lỗi Backend (401, 403) bắn ra Toast
  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await actions.login(data);

      if (result?.success) {
        toast.success("Đăng nhập thành công!");
        window.location.href = "/";
      } else {
        toast.error(result?.message || "Email hoặc mật khẩu không chính xác");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi kết nối hệ thống!");
    }
  };

  return (
    <div className="mt-12 px-4">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Welcome! <span className="underline text-[#6AC259]">E-COMMERCE</span>
        </h2>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="max-w-sm mx-auto space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100"
      >
        {/* Email Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="text"
            {...register("email")}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            placeholder="you@example.com"
            autoComplete="username"
          />
          <InputError message={errors.email?.message} />
        </div>

        {/* Password Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            {...register("password")}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <InputError message={errors.password?.message} />
        </div>

        {/* Nút Submit bị block khi invalid hoặc đang submitting */}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="w-full bg-gradient-to-br from-[#2F8D3A] to-[#6AC259] text-white py-3 rounded-lg font-semibold transition hover:opacity-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>

        {/* chuyển trang */}
        <p className="text-center text-sm text-gray-600 mt-4">
          Chưa có tài khoản?{" "}
          <Link to="/register" className="text-blue-600 hover:underline">
            Đăng ký
          </Link>
        </p>
      </form>
    </div>
  );
}