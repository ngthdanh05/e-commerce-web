import { ChangeEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Rate } from "antd";
import { uploadImage } from "../../services/imageService";
import { useParams } from "react-router-dom";
import { OrderDetailResponse } from "./OrderDetail";
import httpRequest from "../../utils/httpRequest";

interface IReview {
  id: string;
  rating: number;
  description: string;
  images: string;
  public_id: string;
}

export default function WriteReview() {
  const [order, setOrder] = useState<OrderDetailResponse | null>(null);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const { id } = useParams<{ id: string }>();

  const [review, setReview] = useState<IReview>({
    id: "",
    rating: 0,
    description: "",
    images: "",
    public_id: "",
  });

  useEffect(() => {
    fetchOrderById();
  }, []);

  const fetchOrderById = async () => {
    try {
      const res = await httpRequest(`/orders/${id}`);
      setOrder(res.data.order);
    } catch (error) {
      console.error(error);
    }
  };

  const handleDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReview({ ...review, [e.target.name]: e.target.value });
  };

  const handleRatingChange = (value: number) => {
    setReview({ ...review, rating: value });
  };

  useEffect(() => {
    return () => {
      previewImages.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewImages]);

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
    setSelectedFiles((prev) => [...prev, file]);
    setPreviewImages((prev) => [...prev, url]);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (review.rating === 0) {
      toast.error("Vui lòng chọn số sao.");
      return;
    }

    if (!review.description) {
      toast.error("Vui lòng nhập mô tả.");
      return;
    }

    try {
      setUploadLoading(true);

      const uploadedImages = [];
      for (const file of selectedFiles) {
        const res = await uploadImage(file);
        if (res.url && res.id) {
          uploadedImages.push({ url: res.url, public_id: res.id });
        } else {
          throw new Error("Lỗi khi tải hình ảnh.");
        }
      }

      const payload = {
        orderId: id,
        rating: review.rating,
        descriptions: review.description,
        images: uploadedImages,
      };

      //Khi có backend sẽ được call ở đây và có thể sửa payload sao cho được đúng
      // await httpRequest.post('/reviews', payload)

      toast.success("Gửi đánh giá thành công");
    } catch (error) {
      toast.error("Có lỗi xảy ra khi tải hình ảnh.");
      return;
    } finally {
      setUploadLoading(false);
    }
  };

  if (!order || !order.products) {
    return <div className="p-8">Không tìm thấy đơn hàng.</div>;
  }

  return (
    <div className="">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        {order.products.map((item) => (
          <div
            key={item.productId}
            className="flex items-center gap-4 rounded-lg"
          >
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-20 h-20 rounded-lg object-cover border"
            />

            <div className="flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-gray-500">Số lượng: x{item.quantity}</p>
            </div>
          </div>
        ))}
      </div>
      <form>
        <div className="space-y-4 mt-4">
          <div className="flex flex-col justify-center items-center">
            <label className="block text-gray-700 mb-1">
              Chấm điểm đơn hàng của bạn:
            </label>

            <Rate
              value={review.rating}
              onChange={handleRatingChange}
              allowClear={false}
            />

            <p className="text-sm text-gray-500 mt-1">
              {review.rating > 0
                ? `Bạn đã chọn ${review.rating} sao`
                : "Vui lòng chọn số sao"}
            </p>
          </div>

          <div>
            <label className="block text-gray-600 mb-1">
              Chia sẽ suy nghĩ của bạn:
            </label>
            <textarea
              name="description"
              value={review.description}
              onChange={handleDescChange}
              className="w-full border rounded-md outline-none p-2 h-32"
              placeholder="Chia sẽ suy nghĩ của bạn..."
              maxLength={300}
            />
            <p className="text-sm text-gray-500 mt-1">
              {review.description.length}/300 ký tự
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-gray-600">Hình ảnh:</label>

            <div className="flex flex-wrap gap-3">
              {previewImages.length === 0 ? (
                <></>
              ) : (
                previewImages.map((img, i) => (
                  <div
                    key={i}
                    className="relative w-32 h-32 border rounded-xl overflow-hidden shadow"
                  >
                    <img src={img} className="w-full h-full object-cover" />
                  </div>
                ))
              )}

              <label className="w-32 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                />

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7h2l1-2h12l1 2h2v13H3V7z"
                  />
                  <circle cx="12" cy="13" r="3" />
                </svg>

                <span className="text-sm text-gray-500 mt-1">Thêm ảnh</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleSave}
              type="button"
              disabled={uploadLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {uploadLoading ? "Đang gửi..." : "Gửi"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
