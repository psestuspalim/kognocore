import React from 'react';
import UserShell from './UserShell';

export default function Layout({ children, currentPageName }) {
  // Check if the current page is an Admin page
  // Admin pages usually start with "Admin"
  const isAdminPage = currentPageName?.startsWith('Admin');

  // Admin pages typically include their own shell (AdminShell)
  // So we don't wrap them to avoid double shells.
  if (isAdminPage) {
    return <>{children}</>;
  }

  // For regular user pages, we wrap them in the UserShell
  return <UserShell>{children}</UserShell>;
}
