
import React from 'react';
import { Home } from 'lucide-react';
import Index from './pages/Index';

export const navItems = [
  {
    title: "Home",
    to: "/",
    icon: <Home className="h-4 w-4" />,
    page: <Index />,
  },
];
