import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { useNavigate, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Shield, Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react"

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

import heroImage from "@/assets/admin-login-hero.png"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
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
      const success = await login(data.email, data.password, data.rememberMe, 'ADMIN')
      
      if (success) {
        navigate("/admin/dashboard", { replace: true })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      {/* Left: Visual Panel - Hidden on medium and small screens */}
      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden flex-shrink-0 bg-slate-900">
        <img 
          src={heroImage} 
          alt="Admin Dashboard Preview" 
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        
        {/* Overlay - Gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-12 text-white">

           <h1 className="text-5xl font-bold leading-tight mb-5 drop-shadow-xl">
            Centralized 
            System Control
          </h1>
          <p className="text-lg font-medium text-slate-200 drop-shadow-md max-w-xl leading-relaxed">
             Comprehensive oversight of departments, users, and support operations in one powerful, high-performance dashboard.
          </p>
        </div>
      </div>

      {/* Right: Login Form - Full width on medium and small screens */}
      <div className="flex w-full flex-1 flex-col justify-center p-4 sm:p-6 lg:w-[40%] lg:p-12 bg-white min-h-screen lg:min-h-auto">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-6 lg:mb-8 text-center">
            <div className="mb-3 sm:mb-4 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[#00A38C]/10 text-[#00A38C]">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Admin Login
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Secure access for system administrators.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Admin Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="admin@cloudblitz.com"
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


              <Button 
                type="submit" 
                className="w-full bg-[#00A38C] hover:bg-[#008f7a] text-white h-11 sm:h-12 font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Access...
                  </>
                ) : (
                  "Access Control Panel"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
