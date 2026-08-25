import React from 'react';
import { OrderStatusBadge } from './OrderStatusBadge';

interface Order {
  id: string;
  createdAt: string;
  totalAmount: number;
  status: string;
}

interface Props {
  orders: Order[];
  currentStatus: string;
  onFilterChange: (status: string) => void;
  onCancelOrder: (orderId: string) => void;
}

export const OrderHistoryList: React.FC<Props> = ({
  orders,
  currentStatus,
  onFilterChange,
  onCancelOrder,
}) => {
  const tabs = [
    { label: 'Tất cả', value: '' },
    { label: 'Chờ xử lý', value: 'pending' },
    { label: 'Thành công', value: 'success' },
    { label: 'Đã hủy', value: 'cancelled' },
  ];

  return (
    <div className="space-y-4">
      {/* Bộ lọc Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`px-4 py-2 rounded-md font-medium text-sm ${
              currentStatus === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Danh sách đơn hàng */}
      <div className="space-y-3">
        {orders.map((order) => {
          // Disable nút Hủy nếu status là shipping hoặc success
          const isCancelDisabled = ['shipping', 'success'].includes(
            order.status.toLowerCase()
          );

          return (
            <div key={order.id} className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <p className="font-semibold">Đơn hàng #{order.id}</p>
                <p className="text-sm text-gray-500">{order.createdAt}</p>
                <p className="text-sm font-medium mt-1">Tổng tiền: {order.totalAmount.toLocaleString()} VNĐ</p>
              </div>

              <div className="flex items-center gap-4">
                <OrderStatusBadge status={order.status} />

                <button
                  disabled={isCancelDisabled}
                  onClick={() => onCancelOrder(order.id)}
                  className={`px-3 py-1.5 rounded text-sm ${
                    isCancelDisabled
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  Hủy đơn hàng
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};