import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Loader2, Lock, ArrowLeft, Eye, EyeOff } from "lucide-react"

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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { resetPasswordDepartment } from "@/services/departmentAuthService"

const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordData = z.infer<typeof resetPasswordSchema>

export default function DepartmentResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token")
    }
  }, [token])

  async function onSubmit(data: ResetPasswordData) {
    if (!token) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await resetPasswordDepartment(token, data.password)
      if (result.success) {
        navigate("/department/login", { 
          state: { message: "Password reset successful! Please login." } 
        })
      } else {
        setError(result.message || "Failed to reset password")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="w-full max-w-md text-center">
             <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Invalid Link</h2>
            <p className="mb-6 text-muted-foreground">This password reset link is invalid or has expired.</p>
            <Link to="/department/forgot-password">
              <Button>Request a new link</Button>
            </Link>
        </div>
      </div>
    )
  }

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
          <h1 className="mb-4 text-3xl font-bold tracking-tight">Department Portal</h1>
          <p className="max-w-md text-indigo-100 text-lg leading-relaxed">
            Secure your account with a new password.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-indigo-200/60 font-medium">
          University Ticket Management System &copy; 2024
        </div>
      </div>

       {/* Right: Form */}
       <div className="flex w-full flex-col justify-center p-8 lg:w-[40%] lg:p-12">
        <div className="mx-auto w-full max-w-[400px]">
          <Link 
            to="/department/login" 
            className="mb-8 inline-flex items-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Link>

          <div className="mb-8">
             <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 lg:hidden">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Reset Password
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Please enter your new password below.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-9 pr-10"
                          {...field}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          className="pl-9 pr-10"
                          {...field}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
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
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
