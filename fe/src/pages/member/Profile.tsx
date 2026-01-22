import { useEffect, useState } from "react";
import { useUserProfile } from "../../hooks/useUserProfile";
import { checkAuth } from "../../services/authService";

export default function Profile() {
  const { formData, setFormData, saveProfile } = useUserProfile();
  const [user, setUser] = useState({
    name: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await checkAuth();
        setUser({
          name: res.data.name,
        });
      } catch (error) {
        console.error(error);
      }
    };
    fetchUser();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProfile();
    alert("Đã lưu thông tin cá nhân thành công!");
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row w-full gap-8 px-4">
      <div className="flex-1 bg-white p-8 rounded-2xl shadow">
        <h2 className="text-2xl font-bold mb-6">Thông tin cá nhân</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Họ và tên
            </label>
            <input
              type="text"
              value={user.name}
              readOnly
              className="w-full border border-gray-300 rounded-md p-3 focus:ring focus:ring-gray-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Số điện thoại
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring focus:ring-gray-200 outline-none"
            />
          </div>

          <div>
            <span className="block text-gray-700 font-semibold mb-2">
              Giới tính
            </span>
            <div className="flex items-center gap-6">
              {["Nam", "Nữ", "Khác"].map((gender) => (
                <label key={gender} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value={gender}
                    checked={formData.gender === gender}
                    onChange={handleChange}
                  />
                  {gender}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Ngày sinh
            </label>
            <input
              type="date"
              name="birth"
              value={formData.birth}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md p-3 focus:ring focus:ring-gray-200 outline-none"
            />
          </div>

          <button
            type="submit"
            className="bg-black text-white px-6 py-3 rounded-md hover:bg-gray-800 transition"
          >
            Lưu thay đổi
          </button>
        </form>
      </div>
    </div>
  );
}
