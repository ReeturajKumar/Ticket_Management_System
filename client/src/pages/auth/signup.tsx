import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { SignUpFormData, OTPFormData } from "@/lib/validations/auth"
import { registerUser, verifyOTP, resendOTP, storeAuthTokens } from "@/services/authService"
import { SignUpIllustration } from "@/components/auth/SignUpIllustration"
import { FormHeader } from "@/components/auth/FormHeader"
import { RegistrationForm } from "@/components/auth/RegistrationForm"
import { OTPVerificationModal } from "@/components/auth/OTPVerificationModal"

export default function SignUpPage() {
  const navigate = useNavigate()
  const [isOTPDialogOpen, setIsOTPDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")

  const handleRegistration = async (data: SignUpFormData) => {
    setIsLoading(true)
    setSubmitError(null)

    try {
      await registerUser(data)
      setRegisteredEmail(data.email)
      setIsOTPDialogOpen(true)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "An error occurred during registration. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPVerification = async (data: OTPFormData) => {
    setIsLoading(true)
    setSubmitError(null)

    try {
      const result = await verifyOTP(registeredEmail, data.otp)
      
      if (result.data?.accessToken && result.data?.refreshToken && result.data?.user) {
        storeAuthTokens(result.data.accessToken, result.data.refreshToken, result.data.user)
      }

      setSubmitSuccess(true)
      
      setTimeout(() => {
        setIsOTPDialogOpen(false)
        // Redirect to login page
        navigate('/login')
      }, 2000)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Invalid OTP. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setIsLoading(true)
    setSubmitError(null)

    try {
      await resendOTP(registeredEmail)
      setSubmitSuccess(true)
      setTimeout(() => setSubmitSuccess(false), 3000)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to resend OTP. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseOTPModal = () => {
    setIsOTPDialogOpen(false)
    setSubmitError(null)
    setSubmitSuccess(false)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Illustration */}
      <SignUpIllustration />

      {/* Right Panel - Form */}
      <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950 lg:w-[40%] lg:p-8">
        <div className="w-full max-w-md">
          <FormHeader />
          
          <RegistrationForm
            onSubmit={handleRegistration}
            isLoading={isLoading}
            error={submitError}
            success={submitSuccess && !isOTPDialogOpen}
          />
        </div>
      </div>

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={isOTPDialogOpen}
        onClose={handleCloseOTPModal}
        email={registeredEmail}
        onSubmit={handleOTPVerification}
        onResend={handleResendOTP}
        isLoading={isLoading}
        error={submitError}
        success={submitSuccess && isOTPDialogOpen}
      />
    </div>
  )
}
