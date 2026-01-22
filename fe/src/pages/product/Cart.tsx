import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext";

export default function Cart() {
  const { cart, loading, removeFromCart, increaseQuantity, decreaseQuantity } =
    useCart();

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8"></span>
      </div>
    );
  }

  if (!cart || cart.products.length === 0) {
    return (
      <div className="text-center py-10 px-4 sm:px-6 lg:px-8 text-[#4a4a4a] max-w-screen-xl mx-auto">
        <h2 className="text-2xl font-semibold mb-8">
          Chưa có sản phẩm nào trong giỏ hàng.
        </h2>
        <Link
          to="/"
          className="bg-[#4a4a4a] text-white px-6 py-2 rounded hover:bg-[#434343]"
        >
          QUAY TRỞ LẠI CỬA HÀNG
        </Link>
      </div>
    );
  }

  const total = cart.totalPrice || 0;

  return (
    <div className="bg-white shadow-md rounded-md mt-10 px-4 sm:px-6 lg:px-8 py-10 text-[#4a4a4a] max-w-screen-2xl mx-auto">
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white border border-gray-500 p-6 rounded">
          <h2 className="font-bold text-lg mb-4">
            SẢN PHẨM
            <hr className="w-8 border border-[#c0b49f]" />
          </h2>

          <div>
            <div className="hidden sm:grid grid-cols-6 font-bold text-sm uppercase text-[#4a4a4a] border-b py-2">
              <div className="col-span-2">Sản phẩm</div>
              <div className="col-span-1 text-center">Giá</div>
              <div className="col-span-1 text-center">Số lượng</div>
              <div className="col-span-1 text-right pr-2">Tạm tính</div>
            </div>

            {cart.products.map((item) => (
              <div
                key={item.productId}
                className="grid grid-cols-1 sm:grid-cols-6 items-center border mt-2 gap-4 p-4 mb-4 bg-white rounded-xl shadow-sm"
              >
                <div className="sm:col-span-2 flex items-center gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-24 h-20 object-cover rounded-lg shadow"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-base text-gray-800 leading-tight line-clamp-2">
                      {item.name}
                    </p>

                    <p className="sm:hidden mt-1 text-[15px] font-medium text-gray-600">
                      Đơn giá: {item.price.toLocaleString()} VND
                    </p>

                    <p className="sm:hidden mt-1 text-[15px] font-semibold text-[#dc2626]">
                      Tổng: {(item.price * item.quantity).toLocaleString()} VND
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block text-center font-medium text-gray-700">
                  {item.price.toLocaleString()} VND
                </div>

                <div className="flex lg:justify-center justify-between">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.productId)}
                      className="w-9 h-9 flex items-center justify-center border rounded-md text-lg font-semibold"
                    >
                      -
                    </button>

                    <span className="min-w-[28px] text-center font-semibold text-gray-800">
                      {item.quantity}
                    </span>

                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.productId)}
                      className="w-9 h-9 flex items-center justify-center border rounded-md text-lg font-semibold"
                    >
                      +
                    </button>
                  </div>
                  <div className="sm:hidden flex">
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="text-gray-400 hover:text-red-500 transition text-xl"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                </div>

                <div className="hidden sm:block text-right font-semibold text-[#dc2626]">
                  {(item.price * item.quantity).toLocaleString()} VND
                </div>

                <div className="hidden sm:flex justify-center">
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-gray-400 hover:text-red-500 transition text-xl"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link
              to="/"
              className="inline-block bg-[#ff57221a] border-[#ee4d2d] border text-[#ee4d2d] py-2 font-semibold hover:bg-[#ffad941a] px-4 rounded transition"
            >
              ← TIẾP TỤC XEM SẢN PHẨM
            </Link>
          </div>
        </div>

        <div className="bg-white border border-gray-500 p-6 rounded">
          <h3 className="font-bold text-lg mb-4">CỘNG GIỎ HÀNG</h3>
          <div className="space-y-2">
            <div className="flex justify-between font-semibold border-b pb-2">
              <span>Tạm tính</span>
              <span>{total.toLocaleString()} VND</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Tổng</span>
              <span>{total.toLocaleString()} VND</span>
            </div>
          </div>

          <Link
            to="/checkout"
            className="mt-6 block text-center bg-[#ee4d2d] hover:opacity-90 text-white py-3 rounded font-semibold transition"
          >
            TIẾN HÀNH THANH TOÁN
          </Link>
        </div>
      </div>
    </div>
  );
}
