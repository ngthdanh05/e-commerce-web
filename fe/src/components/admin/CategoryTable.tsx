import { useState, useEffect } from "react";
import { Modal } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faPenToSquare,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { toast } from "react-toastify";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "../../services/categoryService";
import httpRequest from "../../utils/httpRequest";

export interface Category {
  id?: string;
  category_id: string;
  category_name: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function CategoryTable() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);

  const [currentCategory, setCurrentCategory] = useState<Category>({
    category_id: "",
    category_name: "",
  });

  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit] = useState<number>(10);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async (page: number = currentPage) => {
    try {
      const res = await httpRequest(
        `/admin/categories?page=${page}&limit=${limit}`
      );
      setCategories(res.data.categories);
      setPagination(res.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error(error);
      toast.error("Không tải được danh mục sản phẩm");
    }
  };

  const handleOpen = () => {
    setIsEdit(false);
    setCurrentCategory({ category_id: "", category_name: "" });
    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setCurrentCategory({
      category_id: "",
      category_name: "",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setCurrentCategory({ ...currentCategory, [name]: value });
  };

  const handleSave = async () => {
    if (!currentCategory.category_id || !currentCategory.category_name) {
      return toast.warning("Vui lòng điền đầy đủ thông tin.");
    }

    setIsModalOpen(false);

    try {
      if (isEdit) {
        await updateCategory(currentCategory);
        toast.success("Đã cập nhật sản phẩm thành công.");
      } else {
        await createCategory(currentCategory);
        toast.success("Đã thêm sản phẩm thành công.");
      }

      handleClose();
      await fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra khi lưu sản phẩm.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

    try {
      await deleteCategory(id);
      toast.success("Đã xóa sản phẩm thành công.");
      await fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error("Đã có lỗi xảy ra khi xóa sản phẩm.");
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchCategories(page);
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">
          Danh sách danh mục ({pagination?.total || 0})
        </h2>
        <button
          onClick={() => handleOpen()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Thêm Danh Mục
        </button>
      </div>

      <div className="border rounded-lg shadow-sm bg-white">
        <div>
          <table className="w-full text-left">
            <thead className="bg-gray-100 sticky top-0 z-10 border-b">
              <tr className="text-gray-700 text-sm uppercase tracking-wide">
                <th className="p-4">TÊN DANH MỤC</th>
                <th className="p-4">ID DANH MỤC</th>
                <th className="p-5 text-center">HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.map((category) => (
                <tr
                  key={category.category_id}
                  className="hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-600">
                      {category.category_name}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-600">
                      {category.category_id}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center font-medium">
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => {
                          setIsEdit(true);
                          setCurrentCategory(category);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-500 cursor-pointer"
                        title="Sửa"
                      >
                        <FontAwesomeIcon icon={faPenToSquare} size="lg" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id!)}
                        className="text-red-500 hover:text-red-300 cursor-pointer"
                        title="Xóa"
                      >
                        <FontAwesomeIcon icon={faTrashCan} size="lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    Không có danh mục nào.
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

      <Modal
        title={isEdit ? "Chỉnh sửa sản phẩm" : "Thêm danh mục mới"}
        open={isModalOpen}
        onCancel={handleClose}
        footer={null}
        width={800}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-gray-600 mb-1">ID Danh Mục:</label>
            <input
              name="category_id"
              value={currentCategory.category_id}
              onChange={handleChange}
              placeholder="Nhập ID danh mục..."
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-gray-600 mb-1">Tên Danh Mục:</label>
            <input
              name="category_name"
              value={currentCategory.category_name}
              onChange={handleChange}
              placeholder="Nhập tên danh mục..."
              className="w-full border rounded-md p-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {isEdit ? "Cập nhật" : "Lưu"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
