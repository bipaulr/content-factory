'use client';

import React, { useState } from 'react';

interface AvatarProps {
  name?: string;
  email?: string;
  image?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, email, image, size = 'md', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  // If there's a valid image and no error, show it
  if (image && !imageError) {
    return (
      <img
        src={image}
        alt={name || email || 'User'}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
        onError={() => setImageError(true)}
      />
    );
  }

  // Generate initials from name or email
  const getInitials = () => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    } else if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  // Generate a consistent color based on email/name
  const getColorClass = () => {
    const str = email || name || '';
    const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-green-500 to-green-600',
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-yellow-500 to-yellow-600',
      'bg-gradient-to-br from-red-500 to-red-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-cyan-500 to-cyan-600',
    ];
    return colors[hash % colors.length];
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white ${getColorClass()} ${className}`}
      title={name || email}
    >
      {getInitials()}
    </div>
  );
}
