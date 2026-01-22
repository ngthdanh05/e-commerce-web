import { createContext, useContext, useEffect, useState } from "react";
import { ICart } from "../types";
import { checkAuth } from "../services/authService";
import {
  getCart,
  addToCart,
  deleteCart,
  updateCart,
} from "../services/cartService";

interface CartContextType {
  cart: ICart | null;
  loading: boolean;
  addCart: (productId: string, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  increaseQuantity: (productId: string) => Promise<void>;
  decreaseQuantity: (productId: string) => Promise<void>;

  reloadCart: () => Promise<void>;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<ICart | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);
  const loadCart = async () => {
    try {
      setLoading(true);
      const user = await checkAuth();
      if (!user) {
        setCart(null);
        return;
      }
      const res = await getCart();
      setCart(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const reloadCart = async () => {
    await loadCart();
  };

  const addCart = async (productId: string, quantity: number = 1) => {
    try {
      await addToCart(productId, quantity);
      await loadCart();
    } catch (error) {
      console.error(error);
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!cart) return;

    const removedItem = cart.products.find((p) => p.productId === productId);
    if (!removedItem) return;

    setCart((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        products: prev.products.filter((p) => p.productId !== productId),
        totalPrice:
          (prev.totalPrice ?? 0) - removedItem.price * removedItem.quantity,
      };
    });

    try {
      await deleteCart(productId);
    } catch (error) {
      console.error(error);
    }
  };

  const increaseQuantity = async (productId: string) => {
    if (!cart) return;
    const item = cart.products.find((p) => p.productId === productId);
    if (!item) return;

    setCart((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        products: prev.products.map((p) =>
          p.productId === productId ? { ...p, quantity: p.quantity + 1 } : p
        ),
        totalPrice: (prev.totalPrice ?? 0) + item.price,
      };
    });

    try {
      await updateCart(productId, item.quantity + 1);
    } catch (error) {
      console.error(error);
    }
  };

  const decreaseQuantity = async (productId: string) => {
    if (!cart) return;
    const item = cart.products.find((p) => p.productId === productId);
    if (!item) return;

    setCart((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        products: prev.products.map((p) =>
          p.productId === productId ? { ...p, quantity: p.quantity - 1 } : p
        ),
        totalPrice: (prev.totalPrice ?? 0) - item.price,
      };
    });

    try {
      await updateCart(productId, item.quantity + 1);
    } catch (error) {
      console.error(error);
    }
  };

  const clearCart = () => {
    setCart({
      userId: cart?.userId || "",
      products: [],
      totalPrice: 0,
    });
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        reloadCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
