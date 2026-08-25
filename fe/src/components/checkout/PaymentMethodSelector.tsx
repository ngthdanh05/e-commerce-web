import React from 'react';

interface Props {
  selectedMethod: string;
  onSelect: (method: string) => void;
}

export const PaymentMethodSelector: React.FC<Props> = ({ selectedMethod, onSelect }) => {
  return (
    <div className="payment-method-selector">
      <h3>Phương thức thanh toán</h3>
      <label className="method-item" style={{ display: 'block', marginBottom: '8px' }}>
        <input
          type="radio"
          name="paymentMethod"
          value="COD"
          checked={selectedMethod === 'COD'}
          onChange={() => onSelect('COD')}
        />
        <span> Thanh toán khi nhận hàng (COD)</span>
      </label>

      <label className="method-item" style={{ display: 'block' }}>
        <input
          type="radio"
          name="paymentMethod"
          value="VNPAY"
          checked={selectedMethod === 'VNPAY'}
          onChange={() => onSelect('VNPAY')}
        />
        <span> Thanh toán qua VNPay</span>
      </label>
    </div>
  );
};