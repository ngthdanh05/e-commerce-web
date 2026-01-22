import httpRequest from "../utils/httpRequest";

export const getCart = async () => {
  const { data } = await httpRequest.get(`/cart`);
  return data;
};

export const addToCart = async (productId: string, quantity: number) => {
  const { data } = await httpRequest.post("/cart/add", { productId, quantity });
  return data;
};

export const updateCart = async (productId: string, quantity: number) => {
  const { data } = await httpRequest.put("/cart/update", {
    productId,
    quantity,
  });
  return data;
};

export const deleteCart = async (productId: string) => {
  const { data } = await httpRequest.delete("/cart/delete", {
    data: { productId },
  });
  return data;
};
