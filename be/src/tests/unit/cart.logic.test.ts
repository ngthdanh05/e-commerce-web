interface CartItem {
  productId: string;
  price: number;
  quantity: number;
}

export const calculateTotalPrice = (products: CartItem[]): number => {
  return products.reduce((sum, p) => sum + p.price * p.quantity, 0);
};

describe("UNIT TEST: Cart Business Logic", () => {
  it("nên tính tổng tiền bằng 0 khi giỏ hàng rỗng", () => {
    const products: CartItem[] = [];
    const total = calculateTotalPrice(products);
    expect(total).toBe(0);
  });

  it("nên tính đúng tổng tiền giỏ hàng có nhiều sản phẩm", () => {
    const products: CartItem[] = [
      { productId: "p1", price: 100000, quantity: 2 },
      { productId: "p2", price: 50000, quantity: 3 },
    ];

    const total = calculateTotalPrice(products);
    expect(total).toBe(350000);
  });

  it("nên tính đúng tổng tiền khi thay đổi số lượng sản phẩm", () => {
    const products: CartItem[] = [
      { productId: "p1", price: 200000, quantity: 1 },
    ];

    products[0].quantity = 5;

    const total = calculateTotalPrice(products);
    expect(total).toBe(1000000);
  });
});
