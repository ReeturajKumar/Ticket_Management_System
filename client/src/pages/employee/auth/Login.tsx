import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ShieldCheck, Loader2, Lock, Mail, Eye, EyeOff, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useAuth } from "@/contexts/AuthContext"

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

  // Check for successful registration message
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Left side same as register or slightly modified */}
      <div className="hidden lg:w-[60%] flex-col justify-between relative p-12 text-white lg:flex bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
            <ShieldCheck className="h-5 w-5" />
            <span className="text-lg font-bold tracking-wide">Internal Portal</span>
          </div>
          
          <div className="space-y-4 max-w-xl">
            <h1 className="text-5xl font-bold tracking-tight leading-tight text-white">
              Secure Employee Access
            </h1>
            <p className="text-xl text-blue-100/90 leading-relaxed font-light">
              Log in to access your internal dashboard, manage your workspace, and resolve system-wide issues.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-sm text-blue-200/50 font-medium">
          <span>EduDesk Internal Systems</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center p-6 lg:w-[40%] lg:p-8">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Welcome back
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Sign in to your employee account.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Internal Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="name@edudesk.com" className="pl-9 h-11" {...field} disabled={isLoading} />
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
                  <FormItem className="space-y-1">
                    <div className="flex items-center justify-between">
                       <FormLabel>Password</FormLabel>
                       <Link to="#" className="text-xs font-medium text-blue-600 hover:underline">Forgot password?</Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          className="pl-9 pr-10 h-11"
                          {...field}
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                 <Checkbox id="remember" checked={form.watch('rememberMe')} onCheckedChange={(checked) => form.setValue('rememberMe', !!checked)} />
                 <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Remember me for 30 days
                 </label>
              </div>

              <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 font-semibold" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                  <>
                    Sign in <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            New employee?{" "}
            <Link to="/employee/register" className="font-medium text-blue-600 hover:text-blue-500 hover:underline">
              Request access account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
