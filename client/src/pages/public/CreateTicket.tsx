import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPublicTicket, getPublicConfig } from '../../services/publicTicketService'
import { toast } from 'react-toastify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Send, CheckCircle2, LifeBuoy } from 'lucide-react'

// Helper to format enum strings nicely (e.g. "PLACEMENT_CELL" -> "Placement Cell")
const formatEnumString = (str: string) => {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const ticketSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  department: z.string().min(1, 'Please select a department'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  priority: z.string().optional(),
})

type TicketFormData = z.infer<typeof ticketSchema>

export default function CreatePublicTicketPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  // Dynamic Config State
  const [departments, setDepartments] = useState<string[]>([])
  const [priorities, setPriorities] = useState<string[]>([])
  const [limitError, setLimitError] = useState(false)

  // Fetch config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      const result = await getPublicConfig()
      if (result.success && result.data) {
        setDepartments(result.data.departments || [])
        setPriorities(result.data.priorities || [])
      } else {
        // Silently handle - server may not be running
        // Fallback to default values if needed
        setLimitError(true)
      }
    }
    fetchConfig()
  }, [])

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      name: '',
      email: '',
      department: '',
      subject: '',
      description: '',
      priority: 'MEDIUM',
    },
  })

  async function onSubmit(data: TicketFormData) {
    setIsLoading(true)
    setLimitError(false)
    try {
      const result = await createPublicTicket(data)
      if (result.success) {
        setIsSuccess(true)
        toast.success('Ticket submitted successfully! Check your email.')
        form.reset()
      } else {
        toast.error(result.message)
        if (result.message && result.message.includes("Too many")) {
           setLimitError(true)
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      
      {/* Left Column: Image & Branding (Hidden on mobile) */}
      <div className="relative hidden w-1/2 lg:flex flex-col justify-between overflow-hidden bg-slate-900 text-white">
        
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop" 
            alt="Modern Corporate Office" 
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>

        {/* Branding Content */}
        <div className="relative z-10 p-12 h-full flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 backdrop-blur-md border border-indigo-500/30">
              <LifeBuoy className="h-6 w-6 text-indigo-200" />
            </div>
            <span className="text-xl font-bold tracking-wide">EduDesk</span>
          </div>

          <div className="space-y-6 max-w-lg mb-12">
            <h1 className="text-5xl font-bold tracking-tight leading-tight">
              Here to Help You Succeed
            </h1>
            <p className="text-xl text-slate-300 font-light leading-relaxed">
              Facing an issue? Submit your query and our department teams will resolve it as quickly as possible. We are dedicated to supporting your success.
            </p>
          </div>
          
          <div className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} EduDesk Support. All rights reserved.
          </div>
        </div>
      </div>

      {/* Right Column: Form */}
      <div className="flex w-full flex-col justify-center lg:w-1/2 bg-slate-50 dark:bg-slate-950 px-4 py-6 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-lg lg:w-[480px]">
          
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center space-y-6 text-center animate-in fade-in zoom-in duration-300">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Ticket Received!</h2>
                <p className="text-lg text-slate-600">
                  Your support request has been successfully submitted.
                </p>
              </div>
              <div className="rounded-lg bg-transparent p-6 border border-slate-200 w-full text-left space-y-4">
                <p className="text-sm text-slate-500">
                  We have sent a confirmation email to the address you provided. Please check your inbox (and spam folder) for your Ticket ID and updates.
                </p>
                <div className="pt-2">
                   <Button 
                    onClick={() => setIsSuccess(false)} 
                    variant="outline" 
                    className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    Submit Another Request
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Submit a Support Ticket
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Fill in the details below to reach the right department.
                </p>
              </div>

              {limitError && (
                 <div className="p-3 mb-4 text-xs text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                    <span className="font-medium">Limit Reached!</span> You have submitted too many requests recently. Please try again later.
                 </div>
              )}

              <div className="rounded-xl bg-transparent p-5 border border-slate-100">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Your Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Jane Doe" {...field} className="h-9 bg-slate-50/50" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                              <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</FormLabel>
                              <FormControl>
                                  <Input placeholder="name@company.com" {...field} className="h-9 bg-slate-50/50" />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                          control={form.control}
                          name="department"
                          render={({ field }) => (
                              <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Department</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                  <SelectTrigger className="h-9 bg-slate-50/50">
                                      <SelectValue placeholder={departments.length > 0 ? "Select..." : "Loading..."} />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {departments.map((dept) => (
                                          <SelectItem key={dept} value={dept}>
                                              {formatEnumString(dept)}
                                          </SelectItem>
                                      ))}
                                      {departments.length === 0 && <SelectItem value="loading" disabled>Loading departments...</SelectItem>}
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                              </FormItem>
                          )}
                      />

                      <FormField
                          control={form.control}
                          name="priority"
                          render={({ field }) => (
                              <FormItem className="space-y-1">
                              <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Urgency</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                  <SelectTrigger className="h-9 bg-slate-50/50">
                                      <SelectValue placeholder={priorities.length > 0 ? "Select..." : "Loading..."} />
                                  </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                      {priorities.map((priority) => (
                                          <SelectItem key={priority} value={priority}>
                                              {formatEnumString(priority)}
                                          </SelectItem>
                                      ))}
                                      {priorities.length === 0 && <SelectItem value="loading" disabled>Loading priorities...</SelectItem>}
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Issue with VPN access or HR policy query" {...field} className="h-9 bg-slate-50/50" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Please provide specific details about your request..." 
                              className="min-h-[80px] bg-slate-50/50 resize-y"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2">
                        <Button 
                            type="submit" 
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 h-10 text-sm font-medium" 
                            disabled={isLoading}
                        >
                            {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting Request...
                            </>
                            ) : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Submit Ticket
                            </>
                            )}
                        </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
