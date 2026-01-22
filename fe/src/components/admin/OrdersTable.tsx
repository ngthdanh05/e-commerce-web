import { useState, useEffect, useRef } from "react";
import {
  faChevronDown,
  faChevronLeft,
  faChevronRight,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import httpRequest from "../../utils/httpRequest";
import { toast } from "react-toastify";

interface UserItem {
  email: string;
  fullName: string;
  avatar?: string;
}

interface OrderProps {
  id: string;
  user: UserItem | null;
  createdAt: string;
  status: string;
  method: string;
  amount: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function OrdersTable() {
  const [orders, setOrders] = useState<OrderProps[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit] = useState<number>(3);

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchOrders = async (page: number = currentPage) => {
    try {
      const res = await httpRequest(`/admin/orders?page=${page}&limit${limit}`);
      setOrders(res.data.orders);
      setPagination(res.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await httpRequest.put(`/admin/orders/${id}`, { status: newStatus });
      await fetchOrders();
      toast.success("Đã cập nhật thành công");
    } catch (error) {
      console.error(error);
      toast.error("Đã có lỗi xảy ra khi cập nhật.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa đơn hàng này?")) return;

    try {
      await httpRequest.delete(`/admin/orders/${id}`);
      await fetchOrders();
      toast.success("Đã xóa thành công.");
    } catch (error) {
      console.error(error);
      toast.error("Đã có lỗi xảy ra khi xóa.");
    }
  };
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchOrders(page);
    }
  };

  const renderPageButtons = () => {
    if (!pagination) return null;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(pagination.totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (currentPage > 1) {
      pages.push(1);
      if (start > 2) pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < pagination.totalPages) {
      if (end < pagination.totalPages - 1) pages.push("...");
      pages.push(pagination.totalPages);
    }

    if (pagination.totalPages <= 5) {
      return Array.from({ length: pagination.totalPages }, (_, i) => {
        const page = i + 1;
        return (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`px-3 py-1 border rounded-md text-sm ${
              page === currentPage
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            {page}
          </button>
        );
      });
    }
  };
  const shouldShowPagination = pagination && pagination.totalPages > 1;

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100">
      <h2 className="text-2xl font-semibold mb-6">
        Danh sách đơn hàng ({orders.length})
      </h2>

      <div className="border rounded-lg shadow-sm bg-white">
        <div>
          <table className="w-full text-left">
            <thead className="bg-gray-100 sticky top-0 z-10 border-b">
              <tr className="text-gray-700 text-sm uppercase tracking-wide">
                <th className="p-4">Người mua</th>
                <th className="p-4">Mã đơn</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4">Số tiền</th>
                <th className="p-4">Phương thức</th>
                <th className="p-4">Ngày mua</th>
                <th className="p-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200 bg-white">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors duration-150"
                >
                  <td className="p-4 w-[320px]">
                    <div className="flex items-center gap-3">
                      {order.user?.avatar ? (
                        <img
                          src={order.user.avatar}
                          alt="avatar"
                          className="w-12 h-12 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                          {order.user?.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="font-semibold text-gray-800">
                          {order.user?.fullName}
                        </p>
                        <p className="text-gray-500 text-sm">
                          {order.user?.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700">{order.id}</td>
                  <td className="p-4 relative">
                    <span
                      onClick={() => setOpenDropdown(order.id)}
                      className={`px-3 py-1 text-sm rounded-md font-medium shadow-sm cursor-pointer transition-all inline-block select-none
                        ${
                          order.status === "pending"
                            ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            : order.status === "success"
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : order.status === "failed"
                            ? "bg-red-100 text-red-600 hover:bg-red-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }
                        `}
                    >
                      {order.status} <FontAwesomeIcon icon={faChevronDown} />
                    </span>

                    {openDropdown === order.id && (
                      <div
                        ref={dropdownRef}
                        className="absolute left-0 mt-2 w-40 bg-white border rounded-lg shadow-lg z-10"
                      >
                        {["pending", "success", "failed"].map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              handleUpdateStatus(order.id, status);
                              setOpenDropdown(null);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100${
                              order.status === status
                                ? "bg-gray-100 font-semibold"
                                : ""
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-semibold text-gray-700">
                    {order.amount.toLocaleString("vi-VN")} VND
                  </td>
                  <td className="p-5 text-gray-700">{order.method}</td>
                  <td className="p-4 text-gray-700">
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(order.id)}
                      className="text-red-500 hover:text-red-400 transition"
                      title="Xóa đơn hàng"
                    >
                      <FontAwesomeIcon icon={faTrashCan} size="lg" />
                    </button>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    Không có đơn hàng nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {shouldShowPagination && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Hiển thị {(currentPage - 1) * limit + 1} đến{" "}
              {Math.min(currentPage * limit, pagination.total)} của{" "}
              {pagination.total} kết quả
            </div>
            <div className="flex items-center gap-1">
              <button
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.hasPrev}
              >
                <FontAwesomeIcon icon={faChevronLeft} size="xs" />
              </button>
              {renderPageButtons()}
              <button
                className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.hasNext}
              >
                <FontAwesomeIcon icon={faChevronRight} size="xs" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
