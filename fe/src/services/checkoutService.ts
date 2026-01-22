import httpRequest from "../utils/httpRequest";

interface CheckoutPayload {
  typePayment: "cod" | "vnpay";
  shippingInfo: {
    fullName: string;
    phoneNumber: string;
    email: string;
    address: string;
    note?: string;
  };
}

export const createCheckout = async (payload: CheckoutPayload) => {
  return await httpRequest.post("/checkout/create", payload);
};
