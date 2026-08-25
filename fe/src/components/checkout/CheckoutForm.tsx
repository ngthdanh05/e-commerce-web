import React, { useState } from 'react';
import { ShippingAddressSection } from './ShippingAddressSection';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface Props {
  isCartEmpty?: boolean;
  onSubmit: (data: any) => void;
}

export const CheckoutForm: React.FC<Props> = ({ isCartEmpty = false, onSubmit }) => {
  const [formData, setFormData] = useState({ fullName: '', phone: '', address: '' });
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; address?: string }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;

    if (!formData.fullName.trim()) newErrors.fullName = 'Họ tên không được để trống';
    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'SĐT không hợp lệ (phải đủ 10 số và đúng đầu số VN)';
    }
    if (formData.address.trim().length < 10) {
      newErrors.address = 'Địa chỉ giao hàng phải từ 10 ký tự trở lên';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({ ...formData, paymentMethod });
    }
  };

  const isFormInvalid =
    isCartEmpty ||
    !formData.fullName ||
    !formData.phone ||
    !formData.address ||
    Object.keys(errors).length > 0;

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <ShippingAddressSection formData={formData} onChange={handleChange} errors={errors} />
      <PaymentMethodSelector selectedMethod={paymentMethod} onSelect={setPaymentMethod} />
      <button type="submit" disabled={isFormInvalid} style={{ marginTop: '16px' }}>
        {paymentMethod === 'VNPAY' ? 'Thanh toán VNPay' : 'Đặt hàng'}
      </button>
    </form>
  );
};