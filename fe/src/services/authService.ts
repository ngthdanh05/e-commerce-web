import httpRequest from "../utils/httpRequest";

interface Data {
  email: string;
  name?: string;
  password?: string;
  confirmPassword?: string;
  newPassword?: string;
}

export const signup = async (data: Data) => {
  return (await httpRequest.post("/auth/register", data)).data;
};

export const signin = async (data: Data) => {
  const res = await httpRequest.post("/auth/login", data);
  return res.data;
};

export const signout = async () => {
  const { data } = await httpRequest.post("/auth/logout", {});
  return data;
};

export const checkAuth = async () => {
  return (await httpRequest.get("/profile")).data;
};
