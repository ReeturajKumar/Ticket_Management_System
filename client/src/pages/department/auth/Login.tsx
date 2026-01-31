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
    <div className="flex min-h-screen bg-white">
      {/* Left: Illustration/Info */}
      <div className="hidden lg:w-[60%] flex-col justify-between relative p-12 text-slate-900 lg:flex bg-slate-50 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#00A38C]/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px]" />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-grid-slate-200/[0.2] bg-[size:32px_32px]" />
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00A38C]/10 border border-[#00A38C]/20 backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-[#00A38C]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">EduDesk Terminal</span>
          </div>
          
          <div className="space-y-4 max-w-xl text-balance">
            <h1 className="text-5xl font-extrabold tracking-tight leading-[1.1] text-slate-900">
              The unified operating system for department management.
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed font-medium">
              Streamline your department workflows, manage complex requests, and deliver exceptional student experiences through our integrated platform.
            </p>
          </div>
        </div>
        
        {/* Testimonial or Trust Element */}
        <div className="relative z-10 p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div className="flex items-center gap-1 mb-4">
            {[1,2,3,4,5].map(i => (
              <svg key={i} className="w-5 h-5 text-amber-500 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-slate-700 font-medium text-lg leading-relaxed mb-6">"TMS has completely transformed our departmental efficiency. The real-time analytics turned our data into actionable insights overnight."</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#00A38C]/10 flex items-center justify-center font-bold text-[#00A38C] text-lg">JS</div>
            <div>
              <p className="text-base font-bold text-slate-900">Janice Smith</p>
              <p className="text-sm font-medium text-slate-500">Director of IT Operations</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-widest">
          <span>Enterprise License: active</span>
          <span>&copy; {new Date().getFullYear()} EduDesk Inc.</span>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full flex-col justify-center p-5 lg:w-[40%] lg:p-8">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-6 text-center lg:text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary lg:hidden">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground dark:text-foreground">
              Welcome back
            </h2>
            <p className="mt-2 text-muted-foreground dark:text-muted-foreground">
              Please enter your credentials to access the portal.
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
                          placeholder="name@company.com"
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link 
                        to="/department/forgot-password"
                        className="text-sm font-medium text-primary hover:text-primary/80 hover:underline dark:text-primary"
                      >
                        Forgot password?
                      </Link>
                    </div>
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
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-10 mt-1 font-bold" 
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

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/department/register" className="font-medium text-primary hover:text-primary/80 hover:underline dark:text-primary">
              Register here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
