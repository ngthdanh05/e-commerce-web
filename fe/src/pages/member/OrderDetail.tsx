import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  faCircleCheck,
  faClock,
  faXmark,
  faBox,
  faUser,
  faReceipt,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import httpRequest from "../../utils/httpRequest";

interface OrderItemDetail {
  productId: string;
  imageUrl: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderDetailResponse {
  id: string;
  createdAt: string;
  status: string;
  products: OrderItemDetail[];
  method: string;
  amount: number;
}

const statusConfig = {
  success: {
    label: "Đã thanh toán",
    color: "bg-green-100 text-green-700",
    icon: <FontAwesomeIcon icon={faCircleCheck} />,
  },
  pending: {
    label: "Đang xử lý",
    color: "bg-yellow-100 text-yellow-700",
    icon: <FontAwesomeIcon icon={faClock} />,
  },
  failed: {
    label: "Đã hủy",
    color: "bg-red-100 text-red-700",
    icon: <FontAwesomeIcon icon={faXmark} />,
  },
} as any;

export default function OrderDetail() {
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    fetchOrderById();
  }, []);

  const fetchOrderById = async () => {
    try {
      setLoading(true);
      const res = await httpRequest(`/orders/${id}`);
      setOrder(res.data.order);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Đang tải chi tiết đơn hàng...</div>;
  }
  if (!order || !order.products) {
    return <div className="p-8">Không tìm thấy đơn hàng.</div>;
  }

  const statusKey = order.status.toLowerCase();
  const status = statusConfig[statusKey] || statusConfig.pending;

  const calculatedTotal = (order.products || []).reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl p-6 ml-4 shadow-md">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Chi tiết đơn hàng</h2>
          <p className="text-gray-500">Mã đơn: {order.id}</p>
        </div>
        <div
          className={`flex items-center gap-3 p-4 rounded-lg ${status.color}`}
        >
          <span className="text-xl">{status.icon}</span>
          <div>
            <p className="font-semibold">{status.label}</p>
            <p className="text-sm">
              Ngày đặt: {new Date(order.createdAt).toLocaleDateString("vi-VN")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FontAwesomeIcon icon={faBox} />
              Sản phẩm đã đặt
            </h3>

            {order.products.map((item) => (
              <div
                key={item.productId}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-20 h-20 rounded-lg object-cover border"
                />

                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-gray-500">
                    Số lượng: {item.quantity}
                  </p>
                </div>

                <div className="text-right font-semibold">
                  {(item.price * item.quantity).toLocaleString("vi-VN")} VND
                </div>
              </div>
            ))}
          </div>

          <div className="md:col-span-1 space-y-6">
            <div className="border p-4 rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} />
                Phương thức thanh toán
              </h3>

              <p className="text-gray-700 font-medium">
                {order.method.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="border p-4 rounded-lg space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FontAwesomeIcon icon={faReceipt} />
              Chi tiết thanh toán
            </h3>

            <div className="flex justify-between text-gray-600">
              <span>Tạm tính</span>
              <span>{calculatedTotal.toLocaleString("vi-VN")} VND</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-xl">
              <span>Tổng cộng</span>
              <span>{order.amount.toLocaleString("vi-VN")} VND</span>
            </div>
          </div>
          <Link
            to="/account/transactionHistory"
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium"
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Quay lại
          </Link>
        </div>
      </div>
    </div>
  );
}
