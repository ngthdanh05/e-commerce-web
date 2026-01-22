import { IProduct } from "../../types";
import { useNavigate } from "react-router-dom";
interface Props {
  product: IProduct;
}

export default function ProductCard({ product }: Props) {
  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/products/${product.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-xl overflow-hidden shadow hover:shadow-lg hover:-translate-y-1 transition relative cursor-pointer"
    >
      <div className="relative">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-52 object-cover"
        />
      </div>

      <div className="p-3 space-y-4">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 h-10">
          {product.name}
        </h3>
        <div className="flex items-center justify-between text-gray-600 ">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Giá: </span>
            <span className="text-red-600 font-semibold text-lg">
              {product.price.toLocaleString("vi-VN")} VND
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
