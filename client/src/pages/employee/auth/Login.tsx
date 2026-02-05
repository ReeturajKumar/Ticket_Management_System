import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Lock, Mail, Eye, EyeOff, ShieldCheck } from "lucide-react"

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
import { useAuth } from "@/contexts/AuthContext"

// Import the specific hero image
import heroImage from "@/assets/employee-login-hero.png"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function EmployeeLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  useEffect(() => {
    if (location.state?.message) {
      toast.info(location.state.message)
    }
  }, [location])

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)
    try {
      const success = await login(data.email, data.password, data.rememberMe, 'EMPLOYEE')
      if (success) {
        navigate("/employee/dashboard")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid credentials")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      {/* Left: Visual Panel - Hidden on medium and small screens */}
      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden flex-shrink-0">
        <img 
          src={heroImage} 
          alt="Employee Dashboard Preview" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        {/* Optional Overlay for text readability if needed, or gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-12 text-white">
             <h1 className="text-5xl font-bold leading-tight mb-4 drop-shadow-md">
            Raise Queries &<br />
            Track Resolutions Perfectly
          </h1>
          <p className="text-lg font-medium text-white/90 drop-shadow-sm max-w-xl">
             Submit your requests, get timely responses, and monitor your ticket status in real-time.
          </p>
        </div>
      </div>

      {/* Right: Login Form - Full width on medium and small screens */}
      <div className="flex w-full flex-1 flex-col justify-center p-4 sm:p-6 lg:w-[40%] lg:p-12 bg-white min-h-screen lg:min-h-auto">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-6 lg:mb-8 text-center">
            <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[#00A38C]/10 text-[#00A38C]">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Employee Login
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Welcome back! Please enter your details to login.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Work Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="name@cloudblitz.com"
                          className="pl-9 h-10 sm:h-11 text-sm sm:text-base bg-white border-slate-200 focus:border-[#00A38C] focus:ring-[#00A38C]"
                          {...field}
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-9 pr-10 h-10 sm:h-11 text-sm sm:text-base bg-white border-slate-200 focus:border-[#00A38C] focus:ring-[#00A38C]"
                          {...field}
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-slate-400 hover:text-slate-600"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">

              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#00A38C] hover:bg-[#008f7a] text-white h-11 sm:h-12 font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-slate-500">
            Don't have an account?{" "}
            <Link to="/employee/register" className="font-medium text-[#00A38C] hover:text-[#008f7a] hover:underline">
              Request access
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
