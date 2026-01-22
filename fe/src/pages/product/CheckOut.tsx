import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { createCheckout } from "../../services/checkoutService";
import { useCart } from "../../context/CartContext";
import { useUserProfile } from "../../hooks/useUserProfile";
import { checkAuth } from "../../services/authService";

const Checkout = () => {
  const [selectedPayment, setSelectedPayment] = useState<"cod" | "vnpay">(
    "cod"
  );

  const navigate = useNavigate();
  const { cart, clearCart, loading } = useCart();
  const { formData } = useUserProfile();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    note: "",
  });

  const total = cart
    ? cart.products.reduce((acc, item) => acc + item.price * item.quantity, 0)
    : 0;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await checkAuth();

        setForm((prev) => ({
          ...prev,
          name: res.data.name || "",
          email: res.data.email || "",
          phone: formData.phone || "",
        }));
      } catch (error) {
        console.error(error);
      }
    };

    fetchUser();
  }, [formData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleOrder = async () => {
    if (!cart || cart.products.length === 0) return alert("Giỏ hàng trống!");

    try {
      const checkoutRes = await createCheckout({
        typePayment: selectedPayment,
        shippingInfo: {
          fullName: form.name,
          phoneNumber: form.phone,
          email: form.email,
          address: form.address,
          note: form.note,
        },
      });

      if (!checkoutRes || !checkoutRes.data) {
        return alert("Lỗi: không nhận được dữ liệu từ server");
      }

      const data = checkoutRes.data;

      if (selectedPayment === "cod") {
        if (data.orderId) {
          clearCart();
          return navigate(`/checkout-success?orderId=${data.orderId}`);
        }
        return;
      }

      if (selectedPayment === "vnpay") {
        if (data.paymentUrl) {
          clearCart();
          window.location.href = data.paymentUrl;
        }
        return;
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi khi đặt hàng!");
    }
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as "cod" | "vnpay";
    setSelectedPayment(value);
  };

  return (
    <div className="shadow-md rounded-md mt-10 max-w-screen-2xl mx-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="border border-gray-500 p-6 rounded bg-white shadow-sm">
        <h2 className="text-xl font-bold text-[#ee4d2d] mb-4">
          THÔNG TIN THANH TOÁN
        </h2>

        <form className="grid grid-cols-2 gap-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="col-span-2 w-full border p-2 rounded"
            placeholder="Họ tên của bạn"
            required
          />

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="Số điện thoại"
          />

          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="Email"
          />

          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            className="col-span-2 w-full border p-2 rounded"
            placeholder="Địa chỉ giao hàng"
          />

          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            className="col-span-2 border p-2 rounded"
            placeholder="Ghi chú đơn hàng"
          />
        </form>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Phương thức thanh toán:</h3>

          <label className="block">
            <input
              type="radio"
              name="paymentMethod"
              value="cod"
              checked={selectedPayment === "cod"}
              onChange={handlePaymentChange}
            />
            <span className="ml-2">Thanh toán khi nhận hàng (COD)</span>
          </label>

          <label className="block mt-2">
            <input
              type="radio"
              name="paymentMethod"
              value="vnpay"
              checked={selectedPayment === "vnpay"}
              onChange={handlePaymentChange}
            />
            <span className="ml-2">Thanh toán VNPay</span>
          </label>

          {selectedPayment === "vnpay" && (
            <div className="mt-4">
              <img
                src="/vnpay.png"
                alt="VNPAY"
                className="w-40 h-auto mx-auto"
              />
            </div>
          )}
        </div>
      </div>

      <div className="border border-gray-500 p-6 rounded-lg bg-white shadow-sm">
        <h2 className="text-xl font-bold text-[#ee4d2d] mb-6">
          ĐƠN HÀNG CỦA BẠN
        </h2>

        {cart?.products?.map((item) => (
          <div
            key={item.productId}
            className="flex justify-between py-2 border-b"
          >
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{(item.price * item.quantity).toLocaleString()} VND</span>
          </div>
        ))}

        <div className="mt-6">
          <div className="flex justify-between font-semibold">
            <span>Tạm tính</span>
            <span>{total.toLocaleString()} VND</span>
          </div>

          <div className="flex justify-between font-bold text-[#dc2626] mt-2 text-lg">
            <span>Tổng</span>
            <span>{total.toLocaleString()} VND</span>
          </div>
        </div>

        <button
          onClick={handleOrder}
          disabled={loading}
          className="mt-8 w-full bg-[#ee4d2d] hover:opacity-90 text-white py-3 rounded font-semibold"
        >
          {loading ? "Đang xử lý..." : "ĐẶT HÀNG"}
        </button>
      </div>

      <Link
        to="/cart"
        className="bg-[#ff57221a] border border-[#ee4d2d] text-[#ee4d2d] px-6 py-2 rounded hover:bg-[#ffd1c1]"
      >
        QUAY TRỞ LẠI GIỎ HÀNG
      </Link>
    </div>
  );
};

export default Checkout;
