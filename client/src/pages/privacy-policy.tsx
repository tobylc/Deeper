import DeeperLogo from "@/components/deeper-logo";

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <DeeperLogo size="md" />
          <span className="ml-3 text-xl font-semibold text-white">Privacy Policy</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-slate-800/50 rounded-2xl p-8 backdrop-blur-sm border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>
          
          <div className="space-y-8 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Information We Collect</h2>
              <p className="leading-relaxed">
                Deeper collects information you provide when creating an account, including your name, email address, 
                and optional phone number for SMS notifications. We also collect conversation messages and voice recordings 
                that you share within the platform to facilitate meaningful connections.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <ul className="space-y-2 leading-relaxed">
                <li>• To provide and maintain our conversation platform services</li>
                <li>• To send important notifications about your conversations and connections</li>
                <li>• To process payments for premium subscriptions</li>
                <li>• To improve our services and user experience</li>
                <li>• To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">SMS Communication Consent</h2>
              <p className="leading-relaxed mb-4">
                By providing your phone number and requesting SMS notifications, you consent to receive text messages from Deeper, including:
              </p>
              <ul className="space-y-2 leading-relaxed mb-4">
                <li>• Verification codes for phone number confirmation</li>
                <li>• Turn notifications when it's your time to respond in conversations</li>
                <li>• Connection notifications when someone accepts or declines your invitation</li>
              </ul>
              <p className="leading-relaxed">
                <strong>Opt-out:</strong> You can stop receiving SMS messages at any time by replying "STOP" to any text message. 
                Standard message and data rates may apply. Message frequency varies based on your conversation activity.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Information Sharing</h2>
              <p className="leading-relaxed">
                Your conversations are private and only shared with the specific person you're connected with. 
                We do not sell, trade, or share your personal information with third parties except as required 
                by law or to provide essential services (payment processing, SMS delivery).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Data Security</h2>
              <p className="leading-relaxed">
                We implement industry-standard security measures to protect your personal information and conversations. 
                All data is encrypted in transit and at rest. Voice messages are securely stored and automatically 
                transcribed for accessibility.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Data Retention</h2>
              <p className="leading-relaxed">
                We retain your account information and conversations for as long as your account is active. 
                You can request deletion of your account and all associated data by contacting us. 
                Some information may be retained for legal compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Cookies and Analytics</h2>
              <p className="leading-relaxed">
                Deeper uses essential cookies for authentication and session management. We may use analytics 
                to understand how our platform is used and to improve the user experience. You can control 
                cookie preferences through your browser settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Children's Privacy</h2>
              <p className="leading-relaxed">
                Deeper is not intended for use by children under 13 years of age. We do not knowingly collect 
                personal information from children under 13. If you believe we have collected information from 
                a child under 13, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Changes to This Policy</h2>
              <p className="leading-relaxed">
                We may update this privacy policy from time to time. We will notify users of any material changes 
                by email or through the platform. Your continued use of Deeper after such modifications constitutes 
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
              <p className="leading-relaxed">
                If you have any questions about this privacy policy or our data practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                <p className="text-white">Email: privacy@joindeeper.com</p>
                <p className="text-white">Website: https://joindeeper.com</p>
              </div>
            </section>

            <div className="text-sm text-slate-400 mt-12 pt-8 border-t border-slate-700">
              <p>Last updated: July 21, 2025</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}