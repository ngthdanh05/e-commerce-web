import { useEffect, useState } from "react";
import {
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faClock,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import httpRequest from "../../utils/httpRequest";

interface OrderItemDetail {
  imageUrl: string;
  name: string;
}

interface ApiTransaction {
  id: string;
  status: string;
  amount: number;
  products: OrderItemDetail[];
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
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
};

export default function transactionHistory() {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit] = useState<number>(3);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (page: number = currentPage) => {
    setIsLoading(true);
    try {
      const res = await httpRequest(`/orders?page=${page}&limit=${limit}`);
      setTransactions(res.data.orders);
      setPagination(res.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchHistory(page);
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

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto bg-white rounded-2xl p-8 ml-4 shadow-md">
        <h2 className="text-2xl font-bold mb-6">Lịch sử giao dịch</h2>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl p-8 ml-4 shadow-md">
      <h2 className="text-2xl font-bold mb-6">Lịch sử giao dịch</h2>

      {transactions.length === 0 ? (
        <p>Bạn chưa có đơn hàng nào.</p>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx, index) => {
            const { id, status, amount, createdAt, products } = tx;

            const statusKey = status.toLowerCase() as keyof typeof statusConfig;
            const statusInfo = statusConfig[statusKey] || statusConfig.pending;
            const firstProduct = products[0];

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
                className="bg-gray-50 hover:bg-gray-100 transition rounded-2xl p-4 sm:p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <img
                      src={firstProduct.imageUrl}
                      alt={firstProduct.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border"
                    />

                    <div className="space-y-1">
                      <p className="font-semibold text-gray-800 text-sm sm:text-base">
                        {firstProduct.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        Mã đơn: {id}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {new Date(createdAt).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <p className="font-bold text-base sm:text-lg text-gray-800">
                      {amount.toLocaleString("vi-VN")} VND
                    </p>

                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 text-xs sm:text-sm font-medium rounded-lg ${statusInfo.color}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>

                    <Link
                      to={`/account/transactionHistory/${id}`}
                      className="text-sm sm:text-base text-blue-600 hover:underline"
                    >
                      Xem chi tiết →
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
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
      )}
    </div>
  );
}
