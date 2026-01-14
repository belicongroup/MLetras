import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SuccessModal({ isOpen, onClose }: SuccessModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md sm:max-w-lg p-0 !rounded-2xl overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-background z-20">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-primary rounded-full shadow-lg">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            You're logged in!
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground px-2 pt-2">
            Your liked songs, folders, and notes will now be synced to the cloud and across devices
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Button
            onClick={onClose}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg shadow-md transition-all"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

