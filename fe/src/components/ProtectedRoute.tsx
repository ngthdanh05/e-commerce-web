import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useEffect, useRef } from "react";
import { useAuth } from "../context/auth/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const isRedirecting = useRef(false);

  useEffect(() => {
    isRedirecting.current = false;
  }, [user]);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const requiresPermission = allowedRoles && allowedRoles.length > 0;
  const hasPermission =
    user &&
    requiresPermission &&
    allowedRoles.some((role) => user.role.includes(role));

  if (requiresPermission && !hasPermission) {
    if (!isRedirecting.current) {
      isRedirecting.current = true;

      toast.error("Bạn không có quyền truy cập trang này!", {
        autoClose: 1500,
        onClose: () => {
          navigate("/", { replace: true });
        },
      });
    }

    return (
      <div className="flex h-screen items-center justify-center">
        Đang chuyển hướng...
      </div>
    );
  }
  return <Outlet />;
};

export default ProtectedRoute;
