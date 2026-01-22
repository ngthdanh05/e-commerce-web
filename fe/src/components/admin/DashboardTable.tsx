import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useEffect, useState } from "react";
import {
  faCartShopping,
  faDollarSign,
  faExchangeAlt,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import httpRequest from "../../utils/httpRequest";

export default function DashboardTable() {
  const [dashboard, setDashboard] = useState<{
    totalProducts: number;
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
  } | null>(null);

  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await httpRequest("/admin/dashboard");
        setDashboard(res.data.data);
        setRevenueData(res.data.data.monthlyRevenue);
      } catch (error) {
        console.error(error);
      }
    };
    fetchDashboard();
  }, []);

  return (
    <div className="p-6 bg-gray-50">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            <FontAwesomeIcon icon={faCartShopping} className="text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Tổng số sản phẩm</p>
            <h3 className="text-2xl font-semibold">
              {(dashboard?.totalProducts ?? 0).toLocaleString("vi-VN")}
            </h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            <FontAwesomeIcon icon={faUser} className="text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Tổng số người dùng</p>
            <h3 className="text-2xl font-semibold">
              {(dashboard?.totalUsers ?? 0).toLocaleString("vi-VN")}
            </h3>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
            <FontAwesomeIcon icon={faExchangeAlt} className="text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Tổng số giao dịch</p>
            <h3 className="text-2xl font-semibold">
              {(dashboard?.totalOrders ?? 0).toLocaleString("vi-VN")}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
          <div className="bg-green-100 text-green-600 p-3 rounded-full">
            <FontAwesomeIcon icon={faDollarSign} className="text-xl" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Tổng doanh thu</p>
            <h3 className="text-2xl font-semibold">
              {(dashboard?.totalRevenue ?? 0).toLocaleString("vi-VN")} VND
            </h3>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-lg border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Doanh thu theo tháng
          </h2>
        </div>

        <div className="h-[550px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={revenueData}
              margin={{ top: 15, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="4 4" />

              <XAxis
                dataKey="month"
                tick={{ fill: "#6b7280", fontSize: 14 }}
                axisLine={{ stroke: "#e5e7eb" }}
              />

              <YAxis
                width={80}
                domain={[0, 10000000]}
                tickFormatter={(value) => value.toLocaleString("vi-VN")}
                tick={{ fill: "#6b7280", fontSize: 14 }}
                axisLine={{ stroke: "#e5e7eb" }}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
                formatter={(value: number) =>
                  value.toLocaleString("vi-VN") + " VND"
                }
              />

              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ r: 5, strokeWidth: 2, fill: "#3b82f6", stroke: "white" }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
