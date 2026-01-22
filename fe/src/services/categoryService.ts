import { Category } from "../components/admin/CategoryTable";
import httpRequest from "../utils/httpRequest";

export const createCategory = async (category: Category) => {
  const { data } = await httpRequest.post("/admin/categories", category);
  return data;
};

export const updateCategory = async ({ id, ...update }: Category) => {
  const { data } = await httpRequest.put(`/admin/categories/${id}`, update);
  return data;
};

export const deleteCategory = async (id: string) => {
  const { data } = await httpRequest.delete(`/admin/categories/${id}`);
  return data;
};
