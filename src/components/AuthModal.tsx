import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Shield, User, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import mletrasLogo from '@/assets/MLetras_logo.png';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthStep = 'email' | 'otp' | 'username' | 'success';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, verifyOTP, setUsername: setUserUsername, user } = useAuth();
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const timeoutIdsRef = useRef<number[]>([]);

  // Utility function to manage timeout cleanup
  const addTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      callback();
      // Remove from tracking array when timeout completes
      timeoutIdsRef.current = timeoutIdsRef.current.filter(id => id !== timeoutId);
    }, delay);
    timeoutIdsRef.current.push(timeoutId);
    return timeoutId;
  }, []);

  // Cleanup all pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
    };
  }, []);

  // Monitor step changes for state management
  useEffect(() => {
    // Step change logic handled by component state
  }, [step]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      await login(email.trim());
      setStep('otp');
      setSuccessMessage('OTP sent to your email!');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await verifyOTP(email.trim(), otp.trim());
      if (response.success) {
        if (response.user.username === null || response.user.username === undefined || response.user.username === '') {
          setSuccessMessage(''); // Clear success message when going to username step
          setStep('username');
        } else {
          setStep('success');
          setSuccessMessage('Welcome to MLetras!');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await setUserUsername(username.trim());
      if (response.success) {
        setStep('success');
        setSuccessMessage('Account created successfully!');
        addTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.message || 'Failed to set username');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set username');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setUsername('');
    setError('');
    setSuccessMessage('');
    onClose();
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-glow h-12 text-lg bg-white/50 border-white/20 placeholder:text-muted-foreground/60"
                required
                disabled={isLoading}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 btn-gradient text-lg font-semibold"
              disabled={isLoading || !email.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5 mr-2" />
                  Send Verification Code
                </>
              )}
            </Button>
          </form>
        );

      case 'otp':
        return (
          <form onSubmit={handleOTPSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="otp" className="text-sm font-medium">
                Verification Code
              </label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                Check your email for the verification code
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify Code
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('email')}
              className="w-full"
            >
              Back to Email
            </Button>
          </form>
        );

      case 'username':
        return (
          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Choose Username
              </label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-glow h-12 text-lg bg-white/50 border-white/20 placeholder:text-muted-foreground/60"
                required
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground text-center">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 btn-gradient text-lg font-semibold"
              disabled={isLoading || !username.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </form>
        );

      case 'success':
        return (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Welcome to MLetras!</h3>
              <p className="text-sm text-muted-foreground">
                You're now logged in and can save your favorite songs and notes.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Get Started
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'email':
        return 'Sign in to MLetras';
      case 'otp':
        return 'Verify Your Email';
      case 'username':
        return 'Create Your Profile';
      case 'success':
        return 'Welcome!';
      default:
        return 'Authentication';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'email':
        return 'Enter your email to receive a verification code';
      case 'otp':
        return 'Enter the 6-digit code sent to your email';
      case 'username':
        return 'Choose a username for your profile';
      case 'success':
        return 'Your account is ready!';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-purple flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo Section */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="logo-glow mb-6 flex justify-center">
            <img 
              src={mletrasLogo} 
              alt="MLetras Logo" 
              className="w-20 h-20 rounded-2xl shadow-2xl"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Welcome to MLetras
          </h1>
          <p className="text-white/80 text-lg">
            {getStepDescription()}
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass border-white/20 animate-slide-up">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              {(step === 'otp' || step === 'username') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep(step === 'username' ? 'otp' : 'email')}
                  className="absolute left-4 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <h2 className="text-2xl font-semibold text-foreground">
                {getStepTitle()}
              </h2>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Success Message */}
            {successMessage && (
              <Alert className="border-accent/20 bg-accent/10 animate-fade-in">
                <Shield className="h-4 w-4 text-accent" />
                <AlertDescription className="text-accent font-medium">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {renderStep()}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-white/60 text-sm animate-fade-in">
          <p>Secure sign-in powered by email verification</p>
        </div>
      </div>
    </div>
  );
}
