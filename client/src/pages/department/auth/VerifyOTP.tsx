import { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { verifyDepartmentOTP, resendDepartmentOTP } from "@/services/departmentAuthService"

const otpSchema = z.object({
  otp: z.string().min(6, "OTP must be 6 characters").max(6, "OTP must be 6 characters"),
})

type OTPFormData = z.infer<typeof otpSchema>

export default function DepartmentVerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email
  const initialMessage = location.state?.message

  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(initialMessage || null)
  const [isVerified, setIsVerified] = useState(false)

  const form = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  })

  useEffect(() => {
    if (!email) {
      navigate("/department/register")
    }
  }, [email, navigate])

  async function onSubmit(data: OTPFormData) {
    if (!email) return

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await verifyDepartmentOTP(email, data.otp)
      
      if (result.success) {
        setIsVerified(true)
        setSuccess("Email verified successfully! Your account is pending admin approval.")
      } else {
        setError(result.message || "Verification failed")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid OTP")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendOTP() {
    if (!email) return

    setIsResending(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await resendDepartmentOTP(email)
      if (result.success) {
        setSuccess("New OTP sent to your email.")
      } else {
        setError(result.message || "Failed to resend OTP")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP")
    } finally {
      setIsResending(false)
    }
  }

  if (!email) return null

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left: Illustration/Info */}
      <div className="hidden lg:w-[60%] flex-col justify-between relative p-12 text-white lg:flex bg-indigo-900 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/department-hero.png" 
            alt="University Administration" 
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 via-indigo-900/20 to-indigo-950/40" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight">Verify Email</h1>
          <p className="max-w-md text-indigo-100 text-lg leading-relaxed">
            One last step to secure your account.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-indigo-200/60 font-medium">
          University Ticket Management System &copy; 2024
        </div>
      </div>

      {/* Right: OTP Form */}
      <div className="flex w-full flex-col justify-center p-8 lg:w-[40%] lg:p-12">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
             <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 lg:hidden">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Verify your email
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              We've sent a 6-digit code to <strong>{email}</strong>
            </p>
          </div>

          {success && (
             <Alert className="mb-6 border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>{success}</AlertDescription>
             </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isVerified ? (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>One-Time Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="123456"
                              className="pl-9 tracking-widest"
                              maxLength={6}
                              {...field}
                              disabled={isLoading}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify Email"
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 text-center text-sm">
                Didn't receive the code?{" "}
                <button 
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? "Sending..." : "Resend OTP"}
                </button>
              </div>
            </>
          ) : (
            <div className="mt-6 space-y-4">
               <Alert className="border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900/50 dark:bg-indigo-950/50 dark:text-indigo-300">
                <AlertCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <AlertTitle>Registration Pending</AlertTitle>
                <AlertDescription>
                  Your email is verified. Please wait for an administrator to approve your account. You will be notified via email.
                </AlertDescription>
              </Alert>

              <Link to="/department/login">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  Back to Login
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
