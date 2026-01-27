import { useState } from "react"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"
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
import { loginAdminUser, storeAdminUser } from "@/services/adminAuthService"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  async function onSubmit(data: LoginFormData) {
    setIsLoading(true)

    try {
      const result = await loginAdminUser(data.email, data.password, false)
      
      if (result.success && result.data?.accessToken && result.data?.refreshToken && result.data?.user) {
        storeAdminUser(
          result.data.user,
          result.data.accessToken,
          result.data.refreshToken
        )
        toast.success(result.message || "Welcome back! Accessing admin panel...")
        navigate("/admin/dashboard", { replace: true })
      } else {
        toast.error(result.message || "Login failed")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left: Illustration/Info */}
      <div className="hidden lg:w-[60%] flex-col justify-between relative p-10 text-white lg:flex bg-gradient-to-br from-purple-950 via-purple-900 to-violet-900 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 z-0">
          {/* Animated gradient orbs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-1/3 -right-32 w-80 h-80 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-700" />
          <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
          
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40" />
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-wide">Admin Panel</span>
          </div>
          
          <div className="space-y-3 max-w-xl">
            <h1 className="text-4xl font-bold tracking-tight leading-tight bg-gradient-to-r from-white via-purple-50 to-white bg-clip-text text-transparent">
              System Administration Hub
            </h1>
            <p className="text-lg text-purple-100/90 leading-relaxed font-light">
              Manage users, monitor system-wide tickets, view analytics, and maintain complete control over the EduDesk platform.
            </p>
          </div>
        </div>
        
        {/* Feature Cards */}
        <div className="relative z-10 grid gap-5">
          <div className="group rounded-2xl bg-white/[0.08] p-4 backdrop-blur-xl border border-white/[0.15] hover:bg-white/[0.12] hover:border-white/25 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 group-hover:bg-purple-500/30 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-base font-bold text-white">User Management</h3>
                <p className="text-xs text-purple-100/70 leading-relaxed">
                  Approve, reject, and manage all system users. View user details, track activity, and maintain access control.
                </p>
              </div>
            </div>
          </div>
          
          <div className="group rounded-2xl bg-white/[0.08] p-4 backdrop-blur-xl border border-white/[0.15] hover:bg-white/[0.12] hover:border-white/25 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 group-hover:bg-violet-500/30 transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="mb-1 text-base font-bold text-white">System Analytics</h3>
                <p className="text-xs text-purple-100/70 leading-relaxed">
                  Monitor system-wide performance, ticket trends, department metrics, and generate comprehensive reports.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-purple-200/50 font-medium">
          <span>EduDesk - Admin Control Panel</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full flex-col justify-center p-5 lg:w-[40%] lg:p-8">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-6 text-center lg:text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-purple-600 lg:hidden">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Admin Login
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Please enter your admin credentials to access the control panel.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
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
                          placeholder="admin@edudesk.com"
                          className="pl-9 h-9 text-sm"
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-9 pr-10 h-9 text-sm"
                          {...field}
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
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
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-10 mt-1" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in to Admin Panel"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
