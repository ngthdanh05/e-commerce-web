import httpRequest from "../utils/httpRequest";

export async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await httpRequest.post("/images/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
}
