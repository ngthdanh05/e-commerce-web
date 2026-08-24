import React from 'react';

type StatusType = 'pending' | 'success' | 'shipping' | 'failed' | 'cancelled' | string;

interface Props {
  status: StatusType;
}

export const OrderStatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeStyle = (status: StatusType) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'success':
      case 'shipping':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(status)}`}>
      {status?.toUpperCase()}
    </span>
  );
};