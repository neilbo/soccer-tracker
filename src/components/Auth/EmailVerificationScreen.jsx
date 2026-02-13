export function EmailVerificationScreen({ email, onBackToLogin }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Check Your Email</h1>
          <p className="text-gray-600 mt-2">We've sent you a verification link</p>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
          <div className="text-center">
            {/* Email Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-full mb-4">
              <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-3">Verify Your Email</h2>

            {email && (
              <p className="text-gray-600 mb-4">
                We sent a verification link to:
                <br />
                <span className="font-medium text-gray-900">{email}</span>
              </p>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-gray-700">
                Click the link in the email to verify your account and complete your registration.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-amber-800 font-medium mb-1">
                📧 Don't see the email?
              </p>
              <p className="text-xs text-amber-700">
                Check your <span className="font-semibold">spam or junk folder</span>.
                Sometimes verification emails end up there.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={onBackToLogin}
                className="w-full px-6 py-3 text-base font-medium rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 transition-all active:scale-95"
              >
                Back to Sign In
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full px-5 py-2.5 text-sm font-medium rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
              >
                Resend Verification Email
              </button>
            </div>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-500 text-center">
              Having trouble? Contact support or check that you entered the correct email address.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-xs text-gray-500">
          The verification link will expire in 24 hours.
        </p>
      </div>
    </div>
  );
}
