import { useState, useEffect, ChangeEvent } from "react";
import { Modal } from "antd";
import { ICategory, IProduct } from "../../types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
  faEdit,
  faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import {
  createProduct,
  deleteProduct,
  getProductById,
  updateProduct,
} from "../../services/productService";
import { toast } from "react-toastify";
import { uploadImage } from "../../services/imageService";
import httpRequest from "../../utils/httpRequest";

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function ProductTable() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewUrlObject, setPreviewUrlObject] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);

  // State cho Validation & Masking
  const [displayPrice, setDisplayPrice] = useState<string>("");
  const [nameError, setNameError] = useState<string>("");
  const [urlError, setUrlError] = useState<string>("");

  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit] = useState<number>(6);

  const [newProduct, setNewProduct] = useState<IProduct>({
    id: "",
    name: "",
    imageUrl: "",
    category: "",
    public_id: "",
    price: 0,
    description: "",
    product_date: new Date(),
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async (page: number = currentPage) => {
    try {
      const res = await httpRequest(
        `/admin/products?page=${page}&limit=${limit}`
      );
      setProducts(res.data.products);
      setPagination(res.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      toast.error("Lỗi tải danh sách sản phẩm");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await httpRequest("/admin/categories");
      setCategories(res.data.categories);
    } catch (error) {
      toast.error("Không tải được danh mục sản phẩm");
    }
  };

  const handleOpen = async (editProduct?: IProduct) => {
    setNameError("");
    setUrlError("");

    if (editProduct) {
      setIsEdit(true);

      const res = await getProductById(editProduct.id);
      const productData = res.data;

      setNewProduct({
        ...productData,
        category:
          productData.category?.category_id || productData.category || "",
        product_date: new Date(productData.product_date),
        imageUrl: productData.imageUrl || "",
      });

      setDisplayPrice(
        productData.price
          ? new Intl.NumberFormat("vi-VN").format(productData.price) + " VND"
          : ""
      );
      setPreviewImage(productData.imageUrl || null);
      setSelectedFile(null);
      setPreviewUrlObject(null);
    } else {
      setIsEdit(false);
      setNewProduct({
        id: "",
        name: "",
        price: 0,
        description: "",
        category: "",
        imageUrl: "",
        public_id: "",
        product_date: new Date(),
      });

      setDisplayPrice("");
      setPreviewImage(null);
      setSelectedFile(null);
      setPreviewUrlObject(null);
    }

    setIsModalOpen(true);
  };

  const handleClose = () => {
    setIsModalOpen(false);

    if (previewUrlObject) URL.revokeObjectURL(previewUrlObject);

    setPreviewImage(null);
    setPreviewUrlObject(null);
    setSelectedFile(null);
    setNameError("");
    setUrlError("");
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  // 1. Chặn nhập chữ + Masking ô Giá (100,000 VND)
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");

    if (!rawValue) {
      setDisplayPrice("");
      setNewProduct((prev) => ({ ...prev, price: 0 }));
      return;
    }

    const numericValue = parseInt(rawValue, 10);
    setNewProduct((prev) => ({ ...prev, price: numericValue }));
    setDisplayPrice(
      new Intl.NumberFormat("vi-VN").format(numericValue) + " VND"
    );
  };

  // 2. Validate Tên sản phẩm quá 100 ký tự
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 100) {
      setNameError("Tên sản phẩm không được vượt quá 100 ký tự!");
    } else {
      setNameError("");
    }
    setNewProduct((prev) => ({ ...prev, name: value }));
  };

  // 3. Validate URL Cloudinary (http:// hoặc https://)
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewProduct((prev) => ({ ...prev, imageUrl: value }));

    const urlPattern = /^(http:\/\/|https:\/\/)/;
    if (value && !urlPattern.test(value)) {
      setUrlError("URL hình ảnh phải có prefix http:// hoặc https://");
    } else {
      setUrlError("");
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrlObject) URL.revokeObjectURL(previewUrlObject);
    };
  }, [previewUrlObject]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File không phải là ảnh!");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh vượt quá 5MB!");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewImage(url);
    setPreviewUrlObject(url);
    setSelectedFile(file);
  };

  const handleSave = async () => {
    try {
      if (nameError || urlError) {
        toast.error("Vui lòng kiểm tra lại thông tin nhập!");
        return;
      }
      if (!newProduct.name.trim()) {
        toast.error("Tên sản phẩm không được để trống!");
        return;
      }
      if (newProduct.name.length > 100) {
        toast.error("Tên sản phẩm vượt quá 100 ký tự!");
        return;
      }
      if (!newProduct.category) {
        toast.error("Vui lòng chọn danh mục sản phẩm!");
        return;
      }

      let imageUrl = newProduct.imageUrl;
      let public_id = newProduct.public_id;

      if (selectedFile) {
        setUploadLoading(true);
        const res = await uploadImage(selectedFile);

        if (!res.success) {
          toast.error("Upload ảnh thất bại!");
          return;
        }

        imageUrl = res.url;
        public_id = res.id;
      }

      const payload = { ...newProduct, imageUrl, public_id };

      if (isEdit) {
        await updateProduct(payload);
        toast.success("Đã cập nhật sản phẩm thành công.");
      } else {
        await createProduct(payload);
        toast.success("Đã thêm sản phẩm thành công.");
      }

      handleClose();
      await fetchProducts();
    } catch (error) {
      toast.error("Có lỗi xảy ra khi lưu sản phẩm.");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

    try {
      await deleteProduct(id);
      toast.success("Đã xóa sản phẩm thành công.");
      await fetchProducts();
    } catch (error) {
      toast.error("Đã có lỗi xảy ra khi xóa sản phẩm.");
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      fetchProducts(page);
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
          Danh sách sản phẩm ({pagination?.total || 0})
        </h2>
        <button
          onClick={() => handleOpen()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Thêm Sản Phẩm
        </button>
      </div>

      <div className="border rounded-lg shadow-sm bg-white">
        <div>
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr className="text-gray-700 text-sm uppercase tracking-wide">
                <th className="p-4 text-left">Ảnh</th>
                <th className="p-4 text-left">Tên</th>
                <th className="p-4 text-left">Giá</th>
                <th className="p-4 text-left">Danh mục</th>
                <th className="p-4 text-center">Hành động</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {products.map((p) => {
                const categoryName =
                  categories.find((c) => c.category_id === p.category)
                    ?.category_name || "Không có danh mục";

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <img
                        src={p.imageUrl || "/default-product.jpg"}
                        className="w-16 h-16 object-cover rounded border"
                      />
                    </td>

                    <td className="p-4 font-medium">{p.name}</td>

                    <td className="p-4">{p.price.toLocaleString()} VND</td>

                    <td className="p-4">{categoryName}</td>

                    <td className="p-4 flex justify-center mt-5 gap-4">
                      <FontAwesomeIcon
                        icon={faEdit}
                        onClick={() => handleOpen(p)}
                        className="text-blue-500 cursor-pointer"
                        size="lg"
                      />
                      <FontAwesomeIcon
                        icon={faTrashCan}
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 cursor-pointer"
                        size="lg"
                      />
                    </td>
                  </tr>
                );
              })}

              {products.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-6 text-gray-500">
                    Không có sản phẩm nào.
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
        title={isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
        open={isModalOpen}
        onCancel={handleClose}
        footer={null}
        width={800}
      >
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-gray-600 mb-1">Tên sản phẩm:</label>
            <input
              name="name"
              value={newProduct.name}
              onChange={handleNameChange}
              className={`w-full border rounded-md p-2 ${
                nameError ? "border-red-500" : ""
              }`}
              placeholder="Nhập tên sản phẩm..."
            />
            {nameError && (
              <p className="text-red-500 text-xs mt-1">{nameError}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Danh mục:</label>
            <select
              name="category"
              value={newProduct.category}
              onChange={handleChange}
              className="w-full border rounded-md p-2"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((cat) => (
                <option key={cat.category_id} value={cat.category_id}>
                  {cat.category_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">
              URL hình ảnh (Cloudinary):
            </label>
            <input
              name="imageUrl"
              type="text"
              value={newProduct.imageUrl}
              onChange={handleUrlChange}
              className={`w-full border rounded-md p-2 ${
                urlError ? "border-red-500" : ""
              }`}
              placeholder="http:// hoặc https://..."
            />
            {urlError && (
              <p className="text-red-500 text-xs mt-1">{urlError}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Hoặc tải ảnh từ máy:</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full"
            />
            {uploadLoading ? (
              <div className="relative w-32 h-32 flex items-center justify-center border rounded">
                {previewImage && (
                  <img
                    src={previewImage}
                    className="absolute w-32 h-32 mt-3 rounded border opacity-50"
                    alt="Preview"
                  />
                )}
                <span className="animate-spin border-4 border-blue-500 border-t-transparent rounded-full w-8 h-8 absolute"></span>
              </div>
            ) : (
              previewImage && (
                <img
                  src={previewImage}
                  className="w-32 h-32 mt-3 rounded border"
                />
              )
            )}
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Giá (VNĐ):</label>
            <input
              name="price"
              type="text"
              value={displayPrice}
              onChange={handlePriceChange}
              className="w-full border rounded-md p-2"
              placeholder="100,000 VND"
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Mô tả:</label>
            <textarea
              name="description"
              value={newProduct.description}
              onChange={handleChange}
              className="w-full border rounded-md p-2 h-24"
              placeholder="Nhập mô tả sản phẩm..."
            />
          </div>

          <div className="flex justify-end gap-3">
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