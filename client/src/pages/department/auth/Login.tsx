import { useState } from "react"
import { toast } from "react-toastify"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react"

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
import { loginDepartmentUser, storeDepartmentTokens } from "@/services/departmentAuthService"

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function DepartmentLoginPage() {
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
      const result = await loginDepartmentUser(data.email, data.password)
      
      if (result.success && result.data?.accessToken && result.data?.refreshToken && result.data?.user) {
        storeDepartmentTokens(result.data.accessToken, result.data.refreshToken, result.data.user)
        toast.success(result.message || "Welcome back! Accessing portal...")
        navigate("/department/dashboard", { replace: true })
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
            Access the centralized management system to handle tickets, view analytics, and optimize team performance.
          </p>
        </div>
        
        <div className="relative z-10 grid gap-6">
          <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-colors">
            <h3 className="mb-2 font-semibold text-white">Department Head Access</h3>
            <p className="text-sm text-indigo-100/80 leading-relaxed">
              Full oversight of department operations, team management, and strategic reporting.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-6 backdrop-blur-md border border-white/10 hover:bg-white/15 transition-colors">
            <h3 className="mb-2 font-semibold text-white">Staff Access</h3>
            <p className="text-sm text-indigo-100/80 leading-relaxed">
              Manage assigned tickets, track resolution times, and process requests efficiently.
            </p>
          </div>
        </div>

        <div className="relative z-10 text-sm text-indigo-200/60 font-medium">
          University Ticket Management System &copy; 2024
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full flex-col justify-center p-8 lg:w-[40%] lg:p-12">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 lg:hidden">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Please enter your credentials to access the portal.
            </p>
          </div>

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

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link 
                        to="/department/forgot-password"
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-9 pr-10"
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in to Portal"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/department/register" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400">
              Register here
            </Link>
          </div>

          <div className="mt-2 text-center text-sm text-muted-foreground">
            Are you a student?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400">
              Go to Student Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
