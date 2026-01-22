import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const showLeftArrow = currentPage > 1;
  const showRightArrow = currentPage < totalPages;

  return (
    <div className="flex justify-center items-center gap-1 md:gap-2 mt-6 flex-wrap">
      {showLeftArrow && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-200 transition shadow-sm"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="w-4 h-4" />
        </button>
      )}

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

      {showRightArrow && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-200 transition shadow-sm"
        >
          <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
