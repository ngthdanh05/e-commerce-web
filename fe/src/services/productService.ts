import { IProduct } from "../types";
import httpRequest from "../utils/httpRequest";

export const getAllProducts = async () => {
  const { data } = await httpRequest.get("/admin/products");
  return data;
};

export const getProductById = async (id: string) => {
  const { data } = await httpRequest.get(`/products/${id}`);
  return data;
};

export const createProduct = async (product: IProduct) => {
  const { data } = await httpRequest.post("/admin/products", product);
  return data;
};

export const updateProduct = async ({ id, ...update }: IProduct) => {
  const { data } = await httpRequest.put(`/admin/products/${id}`, update);
  return data;
};

export const deleteProduct = async (id: string) => {
  const { data } = await httpRequest.delete(`/admin/products/${id}`);
  return data;
};
