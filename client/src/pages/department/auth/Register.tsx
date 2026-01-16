import { useState } from "react"
import { toast } from "react-toastify"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Loader2, Lock, Mail, User, Briefcase, Eye, EyeOff } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { registerDepartmentUser } from "@/services/departmentAuthService"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Please select a department"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function DepartmentRegisterPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      department: "",
      password: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: RegisterFormData) {
    setIsLoading(true)
    try {
      const result = await registerDepartmentUser({
        name: data.name,
        email: data.email,
        password: data.password,
        department: data.department,
        isHead: false, // Default to staff, admins can promote to head later
      })
      
      if (result.success) {
        toast.success(result.message || "Registration successful! Please verify your email.")
        // Redirect to OTP verification with email in state
        navigate("/department/verify-otp", { 
          state: { 
            email: data.email,
            message: "Registration successful! Please verify your email." 
          } 
        })
      } else {
        toast.error(result.message || "Registration failed")
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
          <h1 className="mb-4 text-3xl font-bold tracking-tight">Join the Department</h1>
          <p className="max-w-md text-indigo-100 text-lg leading-relaxed">
            Create your account to start managing tickets and team workflows.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-indigo-200/60 font-medium">
          University Ticket Management System &copy; 2024
        </div>
      </div>

      {/* Right: Register Form */}
      <div className="flex w-full flex-col justify-center p-8 lg:w-[40%] lg:p-12">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 lg:hidden">
              <Building2 className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Create an account
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Enter your details below to request access.
            </p>
          </div>


          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="John Doe"
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
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger className="pl-9 relative">
                           <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                           <SelectValue placeholder="Select your department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLACEMENT">Placement</SelectItem>
                        <SelectItem value="OPERATIONS">Operations</SelectItem>
                        <SelectItem value="TRAINING">Training</SelectItem>
                        <SelectItem value="FINANCE">Finance</SelectItem>
                      </SelectContent>
                    </Select>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
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
                    Creating account...
                  </>
                ) : (
                  "Register"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/department/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
