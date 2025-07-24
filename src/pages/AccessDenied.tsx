import React from 'react';

const AccessDenied = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
        <a href="/" className="underline text-primary">Return Home</a>
      </div>
    </div>
  );
};

export default AccessDenied;
