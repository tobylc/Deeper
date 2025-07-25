import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { User, ArrowRight } from "lucide-react";
import DeeperLogo from "@/components/deeper-logo";

interface NoAccountPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSignUp: () => void;
  email: string;
}

export default function NoAccountPopup({ isOpen, onClose, onSignUp, email }: NoAccountPopupProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-border/50 shadow-2xl rounded-3xl">
        <DialogHeader className="text-center space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-inter font-semibold text-foreground">
                No Account Found
              </DialogTitle>
              <DialogDescription className="text-muted-foreground font-inter">
                We couldn't find an account with this email address
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground font-inter">
              <strong className="text-foreground">{email}</strong> isn't registered with Deeper yet
            </p>
            <p className="text-sm text-muted-foreground font-inter">
              Would you like to create an account to get started?
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={onSignUp}
              className="w-full btn-ocean font-inter font-medium py-3 rounded-3xl transition-all duration-200 group"
            >
              Create Account
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button 
              onClick={onClose}
              variant="ghost"
              className="w-full font-inter font-medium py-2 rounded-3xl text-muted-foreground hover:text-foreground"
            >
              Try Different Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}