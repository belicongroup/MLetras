import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPlatform, isCapacitorEnvironment } from "@/lib/capacitor";
import { toast } from "sonner";
import { SuccessModal } from "@/components/SuccessModal";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { loginWithApple } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleAppleClick = async () => {
    setIsLoading(true);
    try {
      const platform = getPlatform();
      
      // For iOS, use native Apple Sign-In
      if (platform === 'ios' && isCapacitorEnvironment()) {
        try {
          // Import and use Capacitor Apple Sign-In plugin
          const { SignInWithApple } = await import('@capacitor-community/apple-sign-in');
          
          // Call the authorize method with required options
          const result = await SignInWithApple.authorize({
            clientId: 'com.mletras.com',
            redirectURI: 'https://mletras.com',
            scopes: 'email name',
            state: 'state'
          });

          // Extract token and user info from result
          // The plugin returns: { response: { identityToken, authorizationCode, email, user, ... } }
          const identityToken = result.response?.identityToken;
          const authorizationCode = result.response?.authorizationCode;
          const email = result.response?.email;
          const userIdentifier = result.response?.user;

          if (identityToken) {
            // Send to backend
            const response = await loginWithApple(
              identityToken,
              authorizationCode || undefined,
              email || undefined,
              userIdentifier || undefined
            );

            if (response.success) {
              setShowSuccessModal(true);
              onClose();
            } else {
              throw new Error(response.error || 'Apple sign-in failed');
            }
          } else {
            throw new Error('No identity token received from Apple');
          }
        } catch (error: any) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Apple Sign-In error:', error);
            console.error('Error details:', {
              message: error?.message,
              code: error?.code,
              name: error?.name,
              stack: error?.stack,
              toString: error?.toString(),
              fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
            });
          }
          
          // Check if user cancelled
          const errorMsg = error?.message || 
                          error?.toString() || 
                          (typeof error === 'string' ? error : 'Unknown error');
          const errorCode = error?.code || error?.name;
          
          if (errorMsg.toLowerCase().includes('cancel') || 
              errorMsg.toLowerCase().includes('cancelled') ||
              errorCode === 'ERR_CANCELED' ||
              errorCode === 'ERR_USER_CANCELED' ||
              errorCode === '1001') { // Apple's cancellation code
            // User cancelled - don't show error
            if (process.env.NODE_ENV !== 'production') {
              console.log('User cancelled Apple Sign-In');
            }
            return;
          }
          
          toast.error(errorMsg || 'Failed to sign in with Apple. Please try again.');
        }
      } else {
        // For web or Android, show message that Apple Sign-In is iOS only
        toast.error('Apple Sign-In is only available on iOS devices.');
      }
    } catch (error: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Apple Sign-In error:', error);
      }
      toast.error(error.message || 'Failed to sign in with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg md:max-w-2xl p-0 !rounded-2xl overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 bg-background z-20 border-b">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          <div className="flex items-center justify-center mb-2">
            <div className="p-2 bg-gradient-primary rounded-xl shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-lg font-bold">
            Log in or Sign up for free
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground px-2">
            Keep your liked songs, folders, and notes backed up and synced across devices. Reinstalling or switching devices won't erase your saved work when you sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 pb-4 space-y-3">
          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Continue with Apple */}
            <Button
              onClick={handleAppleClick}
              disabled={isLoading}
              className="w-full bg-black hover:bg-black/90 text-white font-semibold py-3 rounded-lg shadow-md transition-all text-sm flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </>
              )}
            </Button>
          </div>

          {/* Terms and Privacy */}
          <div className="pt-1.5 border-t">
            <p className="text-[9px] text-center text-muted-foreground leading-tight px-1">
              By continuing you agree to our{" "}
              <a
                href="https://mletras.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms
              </a>
              {" "}and{" "}
              <a
                href="https://mletras.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </DialogContent>
      
      {/* Success Modal */}
      <SuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
      />
    </Dialog>
  );
}

