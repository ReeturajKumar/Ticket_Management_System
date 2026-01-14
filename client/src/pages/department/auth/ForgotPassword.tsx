import { useState } from "react"
import { Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react"

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
import { forgotPasswordDepartment } from "@/services/departmentAuthService"

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>

export default function DepartmentForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })

  async function onSubmit(data: ForgotPasswordData) {
    setIsLoading(true)
    setError(null)

    try {
      const result = await forgotPasswordDepartment(data.email)
      if (result.success) {
        setIsSuccess(true)
      } else {
        setError(result.message || "Failed to send reset email")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
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
            Recover access to your account securely.
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
              Forgot password?
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {isSuccess ? (
            <div className="space-y-6">
              <Alert className="border-green-200 bg-green-50 text-green-900 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertTitle>Check your email</AlertTitle>
                <AlertDescription>
                  We have sent a password reset link to <strong>{form.getValues("email")}</strong>
                </AlertDescription>
              </Alert>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsSuccess(false)}
              >
                Try another email
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="name@university.edu"
                              className="pl-9"
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
                        Sending link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
