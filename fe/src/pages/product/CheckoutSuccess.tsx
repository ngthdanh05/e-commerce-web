import { motion } from "framer-motion";
import { useSearchParams, Link } from "react-router-dom";

export default function CheckoutSuccess() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  return (
    <div className="flex items-center justify-center pt-10 px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 20 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl px-7 py-10 text-center relative"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="absolute inset-0 flex justify-center -top-4 pointer-events-none"
        >
          <div className="w-32 h-32 bg-green-200 rounded-full blur-3xl opacity-60"></div>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mx-auto w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg relative z-10"
        >
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>

        <h2 className="text-3xl font-bold text-gray-800 mt-5">
          Thanh toán thành công!
        </h2>
        <p className="text-gray-500 mt-2 leading-relaxed">
          Cảm ơn bạn đã mua hàng tại{" "}
          <span className="font-semibold text-gray-700">Shop</span>.
        </p>

        <div className="mt-6 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-xl shadow-md">
          <p className="text-sm opacity-90">Mã đơn hàng:</p>
          <p className="text-lg font-bold tracking-wide">{orderId}</p>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            to={`/account/transactionHistory/${orderId}`}
            className="w-full py-3 rounded-xl bg-black text-white font-semibold hover:bg-gray-900 transition active:scale-95"
          >
            Xem đơn hàng
          </Link>

          <Link
            to="/"
            className="w-full py-3 rounded-xl border font-semibold text-gray-700 hover:bg-gray-100 transition active:scale-95"
          >
            Quay lại trang chủ
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
