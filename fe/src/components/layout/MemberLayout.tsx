import { Outlet, useLocation, useParams } from "react-router-dom";
import AccountSidebar from "../../components/layout/SideBar/AccountSidebar";

export default function MemberLayout() {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const getCurrentLabel = (pathname: string) => {
    if (pathname.endsWith("/account/transactionHistory"))
      return "LỊCH SỬ GIAO DỊCH";
    if (pathname.endsWith(`/account/transactionHistory/${id}`))
      return "CHI TIẾT LỊCH SỬ GIAO DỊCH";
    return "THÔNG TIN CÁ NHÂN";
  };

  const currentLabel = getCurrentLabel(location.pathname);

  return (
    <div className="min-h-screen max-w-screen-xl mx-auto">
      <div className="border-b px-8 py-6">
        <h1 className="text-gray-600 text-3xl font-bold mb-2">HỒ SƠ</h1>
        <h2 className="uppercase  text-gray-700 tracking-wider">
          {currentLabel}
        </h2>
      </div>

      <div className="flex flex-col md:flex-row gap-6 p-6">
        <div className="w-full md:w-[320px]">
          <AccountSidebar />
        </div>

        <div className="w-full space-y-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
