import React from 'react';

interface Props {
  formData: { fullName: string; phone: string; address: string };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  errors: { fullName?: string; phone?: string; address?: string };
}

export const ShippingAddressSection: React.FC<Props> = ({ formData, onChange, errors }) => {
  return (
    <div className="shipping-address-section">
      <h3>Thông tin giao hàng</h3>
      <div className="form-group">
        <label>Họ và tên</label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={onChange}
          placeholder="Nhập họ và tên"
        />
        {errors.fullName && <span className="error" style={{ color: 'red' }}>{errors.fullName}</span>}
      </div>

      <div className="form-group">
        <label>Số điện thoại</label>
        <input
          type="text"
          name="phone"
          value={formData.phone}
          onChange={onChange}
          placeholder="Ví dụ: 0912345678"
        />
        {errors.phone && <span className="error" style={{ color: 'red' }}>{errors.phone}</span>}
      </div>

      <div className="form-group">
        <label>Địa chỉ giao hàng</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={onChange}
          placeholder="Nhập địa chỉ chi tiết (ít nhất 10 ký tự)"
        />
        {errors.address && <span className="error" style={{ color: 'red' }}>{errors.address}</span>}
      </div>
    </div>
  );
};