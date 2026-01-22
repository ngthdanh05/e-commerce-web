import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function MainLayout() {
  const location = useLocation();

  const isAuthPage = ["/login", "/register"].includes(location.pathname);

  const hideFooterRegex =
    /^\/(products\/\d+|cart|checkout|checkout-success|checkout-failure|blogs)$/;

  const shouldShowFooter =
    !hideFooterRegex.test(location.pathname) && !isAuthPage;

  return (
    <>
      {!isAuthPage && <Header />}
      <Outlet />
      {shouldShowFooter && <Footer />}
    </>
  );
}
