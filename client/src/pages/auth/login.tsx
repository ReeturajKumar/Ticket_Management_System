import { useState } from "react"
import { useNavigate } from "react-router-dom"
import type { LoginFormData } from "@/lib/validations/auth"
import { loginUser, storeAuthTokens } from "@/services/authService"
import { SignUpIllustration } from "@/components/auth/SignUpIllustration"
import { LoginHeader } from "@/components/auth/LoginHeader"
import { LoginForm } from "@/components/auth/LoginForm"

export default function LoginPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true)
    setSubmitError(null)

    try {
      const result = await loginUser(data.email, data.password)
      
      if (result.data?.accessToken && result.data?.refreshToken && result.data?.user) {
        storeAuthTokens(result.data.accessToken, result.data.refreshToken, result.data.user)
      }

      // Redirect to home page
      setTimeout(() => {
        navigate('/home')
      }, 1000)
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "An error occurred during login. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Illustration */}
      <SignUpIllustration />

      {/* Right Panel - Form */}
      <div className="flex h-full w-full items-center justify-center overflow-y-auto bg-slate-50 p-6 dark:bg-slate-950 lg:w-[40%] lg:p-8">
        <div className="w-full max-w-md">
          <LoginHeader />
          
          <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            error={submitError}
          />
        </div>
      </div>
    </div>
  )
}
