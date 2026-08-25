import React from 'react';

export const CheckoutFailure: React.FC = () => (
  <div style={{ textAlign: 'center', padding: '40px' }}>
    <h2 style={{ color: 'red' }}>Thanh toán thất bại</h2>
    <p>Giao dịch qua VNPay đã bị hủy hoặc xảy ra lỗi. Vui lòng thử lại.</p>
  </div>
);