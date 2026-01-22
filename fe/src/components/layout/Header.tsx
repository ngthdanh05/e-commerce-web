import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faCartShopping,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "react";
import Search from "../Search";
import * as Popover from "@radix-ui/react-popover";
import { useAuth } from "../../context/auth/AuthContext";
import { useCart } from "../../context/CartContext";
import { useUserProfile } from "../../hooks/useUserProfile";

export default function Header() {
  const { isAuthenticated, user, actions } = useAuth();
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const { cart, removeFromCart } = useCart();

  const { avatar } = useUserProfile();

  const total = cart
    ? cart?.products.reduce((sum, item) => sum + item.price * item.quantity, 0)
    : 0;

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 856);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = async () => {
    await actions.logout();
    window.location.href = "/";
  };

  return (
    <>
      <div className="sticky top-0 z-50 w-full mx-auto h-24 px-4 lg:px-24 flex items-center justify-between md:justify-between shadow-md bg-white rounded-b-xl mt-2">
        <button
          className="md:hidden text-2xl"
          onClick={() => setIsNavbarOpen(true)}
        >
          <FontAwesomeIcon icon={faBars} />
        </button>

        <div className="flex items-center gap-8">
          <Link to="/" className="md:pl-10 flex-shrink-0 cursor-pointer">
            <img
              src="/logo.png"
              alt="Logo"
              className="w-20 h-20 md:w-22 md:h-22 rounded-full border object-cover"
            />
          </Link>
        </div>

        <div className="flex items-center gap-5">
          {/* Search */}
          <div className="hidden md:block mr-8">
            <Search />
          </div>
          <div className="flex gap-2 lg:gap-8">
            <Popover.Root open={isCartOpen} onOpenChange={setIsCartOpen}>
              <Popover.Trigger asChild>
                <button className="relative">
                  <FontAwesomeIcon icon={faCartShopping} size="xl" />
                  {cart?.products && cart?.products.length > 0 && (
                    <span className="absolute -top-2 right-[-8px] bg-pink-700 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                      {cart?.products.length}
                    </span>
                  )}
                </button>
              </Popover.Trigger>
              <Popover.Content
                align="end"
                sideOffset={8}
                className="bg-white rounded-lg shadow-xl border w-80 lg:w-[400px] p-5 z-50"
              >
                {cart?.products.length ? (
                  <>
                    <div className="max-h-80 overflow-y-auto space-y-4">
                      {cart?.products.map((item) => (
                        <div key={item.productId}>
                          <div className="flex items-start gap-4 border-b pb-4">
                            <Link to={`cart/${item.productId}`}>
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg"
                              />
                            </Link>
                            <div className="flex-1 space-y-1">
                              <Link to={`products/${item.productId}`}>
                                <h4 className="font-semibold text-gray-700 hover:text-gray-900">
                                  {item.name}
                                </h4>
                                <p className="text-gray-500">
                                  {item.quantity} ×{" "}
                                  {item.price.toLocaleString()} VND
                                </p>
                              </Link>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-gray-400 hover:text-gray-500"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between border-t pt-4 font-semibold">
                      <span>Tổng cộng:</span>
                      <span className="text-black">
                        {total.toLocaleString()} VND
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <Link to="cart" onClick={() => setIsCartOpen(false)}>
                        <button className="w-full bg-[#ff57221a] border-[#ee4d2d] border text-[#ee4d2d] py-2 font-semibold hover:bg-[#ffad941a] rounded">
                          XEM GIỎ HÀNG
                        </button>
                      </Link>
                      <Link to="checkOut" onClick={() => setIsCartOpen(false)}>
                        <button className="w-full text-white py-2 font-semibold bg-[#ee4d2d] hover:opacity-90 rounded">
                          THANH TOÁN
                        </button>
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-gray-500">
                    Giỏ hàng đang trống
                  </p>
                )}
              </Popover.Content>
            </Popover.Root>
          </div>

          {/* User */}
          <div className="hidden md:flex">
            {isAuthenticated ? (
              <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
                <Popover.Trigger asChild>
                  <div
                    onClick={() => isDesktop && setIsOpen(true)}
                    className="w-12 h-12 rounded-full overflow-hidden border border-gray-300 shadow-sm hover:shadow-md transition cursor-pointer"
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg
                        className="w-12 h-12 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2c-3.2 0-9.5 1.6-9.5 4.9V22h19v-3.1c0-3.3-6.3-4.9-9.5-4.9z" />
                      </svg>
                    )}
                  </div>
                </Popover.Trigger>

                <Popover.Portal>
                  <Popover.Content
                    side="bottom"
                    align="end"
                    className=" bg-white p-4 shadow-lg border border-gray-200 rounded-md w-64 z-50"
                    onClick={() => isDesktop && setIsOpen(false)}
                  >
                    <p className="font-semibold mb-2 text-gray-800">
                      Xin chào,{" "}
                      <span className="text-sky-600">{user?.name}</span>
                    </p>

                    <Link
                      to="/account"
                      className="block w-full text-left text-gray-700 hover:bg-sky-100 hover:text-sky-800 rounded px-3 py-2 transition"
                    >
                      Quản lý hồ sơ
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="mt-2 block w-full text-left text-red-600 hover:bg-red-100 hover:text-red-700 rounded px-3 py-2 transition outline-none cursor-pointer"
                    >
                      Đăng xuất
                    </button>

                    <Popover.Arrow className="fill-white drop-shadow" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            ) : (
              <Link
                to="/login"
                className="bg-gray-800 px-3 py-2 lg:px-5 lg:py-3  rounded-lg hover:bg-gray-700 cursor-pointer"
              >
                <span className="text-white text-base lg:text-lg font-semibold">
                  Login
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-[500] bg-black/50 bg-opacity-40 transition-opacity ${
          isNavbarOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsNavbarOpen(false)}
      />
      <aside
        className={`fixed top-0 left-0 z-[1000] w-70 h-full bg-white shadow-lg transform transition-transform duration-300 ${
          isNavbarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">Menu</h2>
          <button onClick={() => setIsNavbarOpen(false)}>
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
        </div>
        <nav className="flex flex-col items-center p-6 gap-6">
          {/* Avatar */}
          <div className="w-14 h-14 relative rounded-full border-2 border-gray-500 shadow-lg overflow-hidden">
            {/* {avatar ? (
              <img
                src={avatar}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
            )} */}
            <svg
              className="w-14 h-14 text-gray-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2c-3.2 0-9.5 1.6-9.5 4.9V22h19v-3.1c0-3.3-6.3-4.9-9.5-4.9z" />
            </svg>
          </div>

          {/* Search */}
          <div>
            <Search />
          </div>
          {isAuthenticated ? (
            <div className="flex flex-col w-full gap-2 mt-4 ml-4 ">
              <Link
                to="/account"
                onClick={() => setIsNavbarOpen(false)}
                className="block w-full text-left text-gray-700 rounded transition"
              >
                Quản lý hồ sơ
              </Link>

              <button
                onClick={handleLogout}
                className="block w-full text-left text-red-600 rounded transition border-t pt-4"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsNavbarOpen(false)}
              className="bg-gray-800 px-3 py-2 lg:px-5 lg:py-3  rounded-lg hover:bg-gray-700 cursor-pointer"
            >
              <span className="text-white text-base lg:text-lg font-semibold">
                Login
              </span>
            </Link>
          )}
        </nav>
      </aside>
    </>
  );
}
