export interface IProduct {
  id: string;
  name: string;
  imageUrl: string;
  public_id: string;
  price: number;
  category: string;
  product_date: Date;
  description: string;
}

export interface ICategory {
  category_id: string;
  category_name: string;
}

interface ICartProduct {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  quantity: number;
}

export interface ICart {
  _id?: string;
  userId: string;
  products: ICartProduct[];
  totalPrice?: number;
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  role?: "member" | "admin";
}
