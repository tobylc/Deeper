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
      <DialogContent className="sm:max-w-[600px] bg-gradient-to-br from-slate-50 to-blue-50/30 border-2 border-ocean/20">
        <DialogHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <DeeperLogo size="lg" />
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center justify-center space-x-2">
            <QuotesIcon size="md" className="text-ocean" />
            <span>Welcome to Deeper</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Introduction */}
          <Card className="bg-white/80 border-ocean/20">
            <CardContent className="p-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-ocean to-teal flex items-center justify-center mx-auto">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  {isQuestioner ? "You're about to ask your first question!" : "You're about to share your first response!"}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  Deeper uses a unique <strong>turn-based conversation system</strong> designed to create 
                  more thoughtful, meaningful exchanges between you and{" "}
                  <span className="text-ocean font-medium">
                    <UserDisplayName email={otherParticipant} />
                  </span>.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-800 text-center">How Turn-Based Communication Works</h4>
            
            <div className="grid gap-4">
              {isQuestioner ? (
                <>
                  {/* Step 1 - Ask Question */}
                  <Card className="bg-gradient-to-r from-ocean/5 to-ocean/10 border-ocean/20">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-ocean text-white flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <h5 className="font-semibold text-ocean">Ask Your Question</h5>
                        <p className="text-sm text-slate-600">
                          Share your thoughtful question or topic to explore together.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 2 - Wait for Response */}
                  <Card className="bg-gradient-to-r from-amber/5 to-amber/10 border-amber/20">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-amber text-white flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h5 className="font-semibold text-amber-700">Their Turn to Respond</h5>
                        <p className="text-sm text-slate-600">
                          <UserDisplayName email={otherParticipant} /> will receive an email notification and share their thoughtful response.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 3 - Continue Conversation */}
                  <Card className="bg-gradient-to-r from-teal/5 to-teal/10 border-teal/20">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h5 className="font-semibold text-teal-700">Continue the Exchange</h5>
                        <p className="text-sm text-slate-600">
                          Once they respond, you can follow up, ask new questions, or start new conversation threads.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* Step 1 - Question Asked */}
                  <Card className="bg-gradient-to-r from-ocean/5 to-ocean/10 border-ocean/20">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-ocean text-white flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                      <div>
                        <h5 className="font-semibold text-ocean">Question Asked</h5>
                        <p className="text-sm text-slate-600">
                          <UserDisplayName email={otherParticipant} /> has shared a thoughtful question for you to explore.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 2 - Your Response */}
                  <Card className="bg-gradient-to-r from-amber/5 to-amber/10 border-amber/20">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-amber text-white flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                      <div>
                        <h5 className="font-semibold text-amber-700">Share Your Response</h5>
                        <p className="text-sm text-slate-600">
                          Take your time to craft a thoughtful, authentic response that deepens your connection.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 3 - Continue Conversation */}
                  <Card className="bg-gradient-to-r from-teal/5 to-teal/10 border-teal/20">
                    <CardContent className="p-4 flex items-center space-x-4">
                      <div className="w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                      <div>
                        <h5 className="font-semibold text-teal-700">Turn-Based Exchange</h5>
                        <p className="text-sm text-slate-600">
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
          <Card className="bg-gradient-to-r from-purple/5 to-purple/10 border-purple/20">
            <CardContent className="p-4">
              <h5 className="font-semibold text-purple-700 mb-3 flex items-center">
                <Heart className="w-4 h-4 mr-2" />
                Why Turn-Based Communication?
              </h5>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Thoughtful responses:</strong> Time to reflect before sharing</span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Deeper connection:</strong> Quality over quantity in communication</span>
                </li>
                <li className="flex items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple mt-2 mr-3 flex-shrink-0"></div>
                  <span><strong>Email notifications:</strong> Stay connected without constant checking</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h5 className="font-semibold text-slate-700 mb-1">Important to Remember</h5>
                  <p className="text-sm text-slate-600 leading-relaxed">
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