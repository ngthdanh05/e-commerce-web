import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNext?: boolean; // Thêm prop hasNext từ backend (nếu có)
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  hasNext,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Kiểm tra điều kiện disable nút Next: truyền hasNext = false HOẶC đã ở trang cuối
  const isNextDisabled = hasNext !== undefined ? !hasNext : currentPage >= totalPages;
  const isPrevDisabled = currentPage <= 1;

  return (
    <div className="flex justify-center items-center gap-1 md:gap-2 mt-6 flex-wrap">
      {/* Nút Previous */}
      <button
        disabled={isPrevDisabled}
        onClick={() => onPageChange(currentPage - 1)}
        className={`w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 transition shadow-sm ${
          isPrevDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"
        }`}
      >
        <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
      </button>

      {/* Danh sách các trang */}
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`w-10 h-10 flex items-center justify-center rounded-full border transition ${
            page === currentPage
              ? "bg-gray-500 text-white font-semibold shadow-md border-gray-700"
              : "border-gray-300 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {page}
        </button>
      ))}

      {/* Nút Next Page (Disable theo tiêu chí DoD) */}
      <button
        disabled={isNextDisabled}
        onClick={() => onPageChange(currentPage + 1)}
        className={`w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 transition shadow-sm ${
          isNextDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-200"
        }`}
      >
        <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
      </button>
    </div>
  );
}