import React from 'react';
import { OrderStatusBadge } from '../product/OrderStatusBadge';

interface Order {
  id: string;
  customerName: string;
  totalAmount: number;
  status: string;
}

interface Props {
  orders: Order[];
  onUpdateStatus: (orderId: string, newStatus: string) => void;
  onDeleteOrder: (orderId: string) => void;
}

export const AdminOrderTable: React.FC<Props> = ({ orders, onUpdateStatus, onDeleteOrder }) => {
  const handleStatusChange = (orderId: string, newStatus: string) => {
    if (window.confirm(`Xác nhận chuyển trạng thái đơn hàng sang "${newStatus}"?`)) {
      onUpdateStatus(orderId, newStatus);
    }
  };

  const handleDelete = (orderId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa đơn hàng này?')) {
      onDeleteOrder(orderId);
    }
  };

  return (
    <table className="min-w-full border text-left text-sm">
      <thead className="bg-gray-50 border-b">
        <tr>
          <th className="p-3">Mã đơn</th>
          <th className="p-3">Khách hàng</th>
          <th className="p-3">Tổng tiền</th>
          <th className="p-3">Trạng thái</th>
          <th className="p-3">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="border-b">
            <td className="p-3">{order.id}</td>
            <td className="p-3">{order.customerName}</td>
            <td className="p-3">{order.totalAmount.toLocaleString()} VNĐ</td>
            <td className="p-3">
              <OrderStatusBadge status={order.status} />
            </td>
            <td className="p-3 flex gap-2">
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                className="border rounded px-2 py-1 text-xs"
              >
                <option value="pending">pending</option>
                <option value="shipping">shipping</option>
                <option value="success">success</option>
                <option value="cancelled">cancelled</option>
              </select>

              <button
                onClick={() => handleDelete(order.id)}
                className="text-red-600 hover:underline text-xs"
              >
                Xóa
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};