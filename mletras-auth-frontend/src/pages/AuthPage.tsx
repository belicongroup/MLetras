import { useState } from 'react';
import { Mail, Music, ArrowRight, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';

type AuthStep = 'email' | 'otp' | 'success';

export function AuthPage() {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  const { signup, login, verifyOTP } = useAuth();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await signup(email);
      setIsNewUser(response.isNewUser || false);
      setStep('otp');
    } catch (err: any) {
      // If signup fails, try login
      try {
        const loginResponse = await login(email);
        setStep('otp');
      } catch (loginErr: any) {
        const errorMessage = loginErr.message || 'Failed to send verification code';
        const errorDetails = loginErr.details || '';
        
        // Show more helpful error message
        if (errorDetails.includes('EMAIL_API_KEY')) {
          setError('Email service is not properly configured. Please contact support or try again later.');
        } else if (errorMessage.includes('verification email')) {
          setError('Unable to send verification email. Please check your email address and try again.');
        } else {
          setError(errorMessage);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await verifyOTP(email, otpCode);
      if (response.success) {
        setStep('success');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signup(email);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setOtpCode('');
    setError('');
    setIsNewUser(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <Music className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {step === 'email' && 'Welcome to MLetras'}
            {step === 'otp' && 'Check your email'}
            {step === 'success' && 'Welcome!'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'email' && 'Sign in with your email to access lyrics and music'}
            {step === 'otp' && `Enter the 6-digit code sent to ${email}`}
            {step === 'success' && 'You\'re all set! Redirecting to dashboard...'}
          </p>
        </div>

        {/* Success Step */}
        {step === 'success' && (
          <Card className="animate-fade-in">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {isNewUser ? 'Account created successfully!' : 'Welcome back!'}
                </h3>
                <p className="text-sm text-gray-600">
                  Redirecting to your dashboard...
                </p>
                <div className="mt-4">
                  <LoadingSpinner />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Get started</CardTitle>
              <CardDescription>
                Enter your email address to sign in or create an account
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEmailSubmit}>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    error={!!error}
                    helperText={error}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full"
                  loading={isLoading}
                  disabled={!email.trim() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle>Enter verification code</CardTitle>
              <CardDescription>
                We sent a 6-digit code to <span className="font-medium">{email}</span>
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleOTPSubmit}>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1">
                    Verification code
                  </label>
                  <Input
                    id="otp"
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    error={!!error}
                    helperText={error}
                    className="text-center text-lg tracking-widest"
                  />
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isLoading}
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    Didn't receive the code? Resend
                  </button>
                </div>
              </CardContent>
              <CardFooter className="flex space-x-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  loading={isLoading}
                  disabled={otpCode.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}






