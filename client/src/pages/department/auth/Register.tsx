import { useState } from "react"
import { toast } from "react-toastify"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Lock, Mail, User, Briefcase, Eye, EyeOff, Building2 } from "lucide-react"

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

import heroImage from "@/assets/department-register-hero.webp"

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  department: z.string().min(1, "Please select a department"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function DepartmentRegisterPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      department: "",
      password: "",
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
        isHead: false,
      })
      
      if (result.success) {
        toast.success(result.message || "Registration successful! Please wait for admin approval.")
        navigate("/department/login")
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
    <div className="flex flex-col lg:flex-row min-h-screen bg-white">
      {/* Left: Visual Panel - Hidden on medium and small screens */}
      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden flex-shrink-0">
        <img 
          src={heroImage} 
          alt="Department Registration" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-12 text-white">
           <h1 className="text-5xl font-bold leading-tight mb-4 drop-shadow-md">
            Expand Your<br />
            Department's Capabilities
          </h1>
          <p className="text-lg font-medium text-white/90 drop-shadow-sm max-w-xl">
             Register your department unit to start managing ticketing and support workflows through our centralized platform.
          </p>
        </div>
      </div>

      {/* Right: Registration Form - Full width on medium and small screens */}
      <div className="flex w-full flex-1 flex-col justify-center p-4 sm:p-6 lg:w-[40%] lg:p-8 bg-white min-h-screen lg:min-h-auto">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-4 lg:mb-6 text-center">
            <div className="mb-3 inline-flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-[#00A38C]/10 text-[#00A38C]">
              <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Department Registration
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Create your account to manage department requests.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 lg:space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <Input 
                          placeholder="John Doe" 
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
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Department Email</FormLabel>
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
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm sm:text-base">Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                      <FormControl>
                        <div className="relative">
                           <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400 z-10" />
                           <SelectTrigger className="pl-9 h-10 sm:h-11 text-sm sm:text-base bg-white border-slate-200 focus:ring-[#00A38C] focus:border-[#00A38C]">
                              <SelectValue placeholder="Select your department" />
                           </SelectTrigger>
                        </div>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PLACEMENT">Placement</SelectItem>
                        <SelectItem value="OPERATIONS">Operations</SelectItem>
                        <SelectItem value="TRAINING">Training</SelectItem>
                        <SelectItem value="FINANCE">Finance</SelectItem>
                        <SelectItem value="HR">HR Department</SelectItem>
                        <SelectItem value="TECHNICAL_SUPPORT">Technical Support</SelectItem>
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
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                    Registering...
                  </>
                ) : (
                  "Request Registration"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 lg:mt-6 text-center text-xs sm:text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/department/login" className="font-medium text-[#00A38C] hover:text-[#008f7a] hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
