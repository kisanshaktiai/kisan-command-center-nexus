
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminInviteRegistration } from '@/components/auth/AdminInviteRegistration';

const AdminInviteRoute: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/auth');
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-4">Invalid Invite</h1>
          <p className="text-muted-foreground mb-4">The invitation link is invalid or missing.</p>
          <a href="/auth" className="text-primary hover:underline">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <AdminInviteRegistration 
        inviteToken={token}
        onComplete={handleComplete}
      />
    </div>
  );
};

export default AdminInviteRoute;
