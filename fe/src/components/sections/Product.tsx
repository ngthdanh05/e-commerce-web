import { useState, useEffect } from "react";
import ProductCard from "../product/ProductCard";
import { IProduct } from "../../types";
import { useSearchParams } from "react-router-dom";
import httpRequest from "../../utils/httpRequest";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

interface Pagination {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function Product() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParams = searchParams.get("category") || "all_products";
  const [selectCategory, setSelectCategory] = useState(categoryParams);

  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [limit] = useState<number>(8);

  useEffect(() => {
    fetchProducts(1);
  }, [selectCategory]);

  const fetchProducts = async (page: number = currentPage) => {
    try {
      const res = await httpRequest.get(
        `/products?page=${page}&limit=${limit}`
      );
      setProducts(res.data.products);
      setPagination(res.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error(error);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectCategory(e.target.value);
    setSearchParams({ category: e.target.value });
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

  const filteredProducts =
    selectCategory === "all_products"
      ? products
      : products.filter((product) => product.category === selectCategory);

  return (
    <section className="relative min-h-screen w-full overflow-hidden pt-8 mt-12 p-6">
      <div className="flex gap-6">
        <div className="flex-1">
          <div className="flex justify-between mb-2 border-b pb-4">
            <div className="flex gap-4 items-center">
              <h2 className="text-base lg:text-2xl text-gray-700 font-bold">
                Có <span className="underline">{pagination?.total || 0}</span>{" "}
                sản phẩm
              </h2>

              <div className="flex border text-sm border-gray-700">
                <select
                  name="Chose"
                  className="p-1"
                  onChange={handleFilterChange}
                  value={selectCategory}
                >
                  <option value="all_products">Tất cả sản phẩm</option>
                  <option value="ban_phim">Bàn Phím</option>
                  <option value="chuot">Chuột</option>
                  <option value="tai_nghe">Tai Nghe</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 mt-4">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </div>
      {pagination && (
        <div className="mt-4 bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
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
    </section>
  );
}
