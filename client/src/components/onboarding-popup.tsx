import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, ArrowRight, Clock, Heart } from "lucide-react";
import DeeperLogo from "@/components/deeper-logo";
import QuotesIcon from "@/components/quotes-icon";
import { UserDisplayName } from "@/hooks/useUserDisplayName";

interface OnboardingPopupProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: 'questioner' | 'responder';
  otherParticipant: string;
  relationshipType: string;
}

export default function OnboardingPopup({ 
  isOpen, 
  onClose, 
  userRole, 
  otherParticipant, 
  relationshipType 
}: OnboardingPopupProps) {
  const isQuestioner = userRole === 'questioner';

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#1B2137] to-[#0F1419] border-2 border-[#4FACFE]/30 backdrop-blur-md">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 w-8 h-8 rounded-full bg-[#4FACFE]/20 hover:bg-[#4FACFE]/30 flex items-center justify-center text-white/80 hover:text-white transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <DialogHeader className="text-center space-y-4 pt-2">
          <div className="flex justify-center">
            <DeeperLogo size="lg" />
          </div>
          <DialogTitle className="text-2xl font-bold text-white flex items-center justify-center space-x-2">
            <QuotesIcon size="md" className="text-[#4FACFE]" />
            <span>Welcome to Deeper</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Introduction */}
          <Card className="bg-[#1B2137]/80 border-[#4FACFE]/30 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#4FACFE] to-teal flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {isQuestioner ? "You're about to ask your first question!" : "You're about to share your first response!"}
                </h3>
                <p className="text-slate-300 leading-relaxed">
                  Deeper uses a unique <strong className="text-white">turn-based conversation system</strong> designed to create 
                  more thoughtful, meaningful exchanges between you and{" "}
                  <span className="text-[#4FACFE] font-medium">
                    <UserDisplayName email={otherParticipant} />
                  </span>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white text-center">How Turn-Based Communication Works</h4>
            
            <div className="grid gap-4">
              {isQuestioner ? (
                <>
                  {/* Step 1 - Ask Question */}
                  <Card className="bg-gradient-to-r from-[#4FACFE]/10 to-[#4FACFE]/20 border-[#4FACFE]/30 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-[#4FACFE] text-white flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <h5 className="font-semibold text-[#4FACFE]">Ask Your Question</h5>
                        <p className="text-sm text-slate-300">
                          Share your thoughtful question or topic to explore together.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 2 - Wait for Response */}
                  <Card className="bg-gradient-to-r from-[#D7A087]/10 to-[#D7A087]/20 border-[#D7A087]/30 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-[#D7A087] text-white flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h5 className="font-semibold text-[#D7A087]">Their Turn to Respond</h5>
                        <p className="text-sm text-slate-300">
                          <UserDisplayName email={otherParticipant} /> will receive an email notification and share their thoughtful response.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 3 - Continue Conversation */}
                  <Card className="bg-gradient-to-r from-teal/10 to-teal/20 border-teal/30 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h5 className="font-semibold text-teal-300">Continue the Exchange</h5>
                        <p className="text-sm text-slate-300">
                          Once they respond, you can follow up, ask new questions, or start new conversation threads.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* Step 1 - Question Asked */}
                  <Card className="bg-gradient-to-r from-[#4FACFE]/10 to-[#4FACFE]/20 border-[#4FACFE]/30 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-[#4FACFE] text-white flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <h5 className="font-semibold text-[#4FACFE]">Question Asked</h5>
                        <p className="text-sm text-slate-300">
                          <UserDisplayName email={otherParticipant} /> has shared a thoughtful question for you to explore.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 2 - Your Response */}
                  <Card className="bg-gradient-to-r from-[#D7A087]/10 to-[#D7A087]/20 border-[#D7A087]/30 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-[#D7A087] text-white flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h5 className="font-semibold text-[#D7A087]">Share Your Response</h5>
                        <p className="text-sm text-slate-300">
                          Take your time to craft a thoughtful, authentic response that deepens your connection.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 3 - Continue Conversation */}
                  <Card className="bg-gradient-to-r from-teal/10 to-teal/20 border-teal/30 backdrop-blur-sm">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h5 className="font-semibold text-teal-300">Turn-Based Exchange</h5>
                        <p className="text-sm text-slate-300">
                          After you respond, they can follow up or ask new questions, creating meaningful dialogue.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Key Benefits */}
          <Card className="bg-gradient-to-r from-purple-500/10 to-purple-400/20 border-purple-400/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <h5 className="font-semibold text-purple-300 mb-3 flex items-center">
                <QuotesIcon size="sm" className="mr-2" />
                Why Turn-Based Communication?
              </h5>
              <ul className="space-y-2 text-sm text-slate-300">
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong className="text-white">Thoughtful responses:</strong> Time to reflect before sharing</span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong className="text-white">Deeper connection:</strong> Quality over quantity in communication</span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong className="text-white">Email notifications:</strong> Stay connected without constant checking</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="bg-gradient-to-r from-slate-700/20 to-slate-600/30 border-slate-500/30 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-slate-200 mb-1">Important to Remember</h5>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Express your thoughts fully while it's your turn—you won't be able to respond again 
                    until <UserDisplayName email={otherParticipant} /> submits their follow-up. This encourages 
                    more complete, meaningful communication.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="text-center pt-4">
            <Button 
              onClick={onClose}
              className="bg-gradient-to-r from-ocean to-teal text-white hover:from-ocean/90 hover:to-teal/90 px-8 py-3 text-lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {isQuestioner ? "Ask My First Question" : "Share My First Response"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}