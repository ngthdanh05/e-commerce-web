import { useState, useEffect } from "react";
import {
  faBan,
  faTrashCan,
  faUnlock,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import httpRequest from "../../utils/httpRequest";
import { toast } from "react-toastify";

interface UserProps {
  _id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
  avatar?: string;
  isBlocked: boolean;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function UsersTable() {
  const [users, setUsers] = useState<UserProps[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit] = useState<number>(7);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (page: number = currentPage) => {
    try {
      const res = await httpRequest(`/admin/users?page=${page}&limit=${limit}`);
      setUsers(res.data.users);
      setPagination(res.data.pagination);
      setCurrentPage(page);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBlock = async (id: string, isBlocked: boolean) => {
    try {
      await httpRequest.put(`/admin/users/${id}/block`, { block: !isBlocked });
      toast.success(isBlocked ? "Đã mở chặn" : "Đã chặn người dùng");
      fetchUsers();
    } catch {
      toast.error("Không thể thực hiện thao tác");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa người dùng này?")) return;

    try {
      await httpRequest.delete(`/admin/users/${id}`);
      await fetchUsers();
      toast.success("Đã xóa thành công");
    } catch {
      toast.error("Đã có lỗi xảy ra khi xóa.");
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchUsers(page);
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
        Danh sách người dùng ({pagination?.total || 0})
      </h2>

      <div className="border rounded-lg shadow-sm bg-white">
        <div>
          <table className="w-full text-left">
            <thead className="bg-gray-100 sticky top-0 border-b">
              <tr className="text-gray-700 text-sm uppercase">
                <th className="p-4">Người dùng</th>
                <th className="p-4">Vai trò</th>
                <th className="p-4">Ngày tạo</th>
                <th className="p-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {users.map((user) => (
                <tr
                  key={user._id}
                  className={user.isBlocked ? "bg-red-50" : ""}
                >
                  <td className="p-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">{user.role}</td>
                  <td className="p-4">
                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                  </td>

                  <td className="p-4 text-center space-x-4">
                    <button
                      onClick={() => toggleBlock(user._id, user.isBlocked)}
                      className="text-yellow-600"
                    >
                      <FontAwesomeIcon
                        icon={user.isBlocked ? faUnlock : faBan}
                        size="lg"
                      />
                    </button>

                    <button
                      onClick={() => handleDelete(user._id)}
                      className="text-red-500"
                    >
                      <FontAwesomeIcon icon={faTrashCan} size="lg" />
                    </button>
                  </td>
                </tr>
              ))}
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
