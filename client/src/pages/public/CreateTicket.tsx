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
import { Loader2, Send, CheckCircle2, ShieldCheck } from 'lucide-react'

// Helper to format enum strings nicely
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

  useEffect(() => {
    const fetchConfig = async () => {
      const result = await getPublicConfig()
      if (result.success && result.data) {
        setDepartments(result.data.departments || [])
        setPriorities(result.data.priorities || [])
      } else {
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
    <div className="flex min-h-screen bg-white">
      
      {/* Left: Visual Panel - Reduced width to 50% for more balance */}
      <div className="hidden lg:block lg:w-[60%] relative overflow-hidden flex-shrink-0 bg-slate-900 h-screen sticky top-0">
        <img 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2070&auto=format&fit=crop" 
          alt="Student Support" 
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent flex flex-col justify-end p-10 text-white text-left">
           <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4 drop-shadow-xl">
            Here to Help You Succeed
          </h1>
          <p className="text-base lg:text-lg font-medium text-slate-200 drop-shadow-md max-w-md leading-relaxed">
             Submit your query and our department teams will resolve it as quickly as possible.
          </p>
        </div>
      </div>

      {/* Right: Form - Increased width to 50% */}
      <div className="flex w-full lg:w-[40%] flex-col justify-center px-6 py-8 lg:p-12 bg-white flex-1 min-h-screen">
        <div className="mx-auto w-full max-w-md">
          
          {isSuccess ? (
            <div className="flex flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in duration-300 py-6">
              <div className="h-20 w-20 rounded-full bg-[#00A38C]/10 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-10 w-10 text-[#00A38C]" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ticket Received!</h2>
                <p className="text-base text-slate-500 font-medium">
                  Your support request has been successfully submitted.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-6 border border-slate-100 w-full text-left space-y-3 shadow-sm">
                <p className="text-xs text-slate-600 leading-relaxed">
                  We have sent a confirmation email to the address you provided. Please check your inbox (and spam folder) for your Ticket ID and updates.
                </p>
                <div className="pt-2">
                   <Button 
                    onClick={() => setIsSuccess(false)} 
                    variant="outline" 
                    className="w-full border-[#00A38C] text-[#00A38C] hover:bg-[#00A38C]/10 hover:text-[#00A38C] font-bold h-10"
                  >
                    Submit Another Request
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center lg:text-left">

                <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
                  Submit a Ticket
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Fill in the details below to reach the right department.
                </p>
              </div>

              {limitError && (
                 <div className="p-3 mb-4 text-xs text-red-800 rounded-lg bg-red-50 border border-red-100 flex items-center gap-2 animate-pulse" role="alert">
                    <ShieldCheck className="h-4 w-4" />
                    <div>
                      <span className="font-bold block">Limit Reached!</span>
                      Please try again later.
                    </div>
                 </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} className="h-9 text-sm bg-white border-slate-200 focus:border-[#00A38C] focus:ring-[#00A38C]" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</FormLabel>
                            <FormControl>
                                <Input placeholder="name@company.com" {...field} className="h-9 text-sm bg-white border-slate-200 focus:border-[#00A38C] focus:ring-[#00A38C]" />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                            </FormItem>
                        )}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-[#00A38C] focus:border-[#00A38C]">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept} className="text-sm">
                                            {formatEnumString(dept)}
                                        </SelectItem>
                                    ))}
                                    {departments.length === 0 && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                                </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                            <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Urgency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger className="h-9 text-sm bg-white border-slate-200 focus:ring-[#00A38C] focus:border-[#00A38C]">
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {priorities.map((priority) => (
                                        <SelectItem key={priority} value={priority} className="text-sm">
                                            {formatEnumString(priority)}
                                        </SelectItem>
                                    ))}
                                    {priorities.length === 0 && <SelectItem value="loading" disabled>Loading...</SelectItem>}
                                </SelectContent>
                            </Select>
                            <FormMessage className="text-[10px]" />
                            </FormItem>
                        )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief summary of your issue..." {...field} className="h-9 text-sm bg-white border-slate-200 focus:border-[#00A38C] focus:ring-[#00A38C]" />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Please provide specific details about your request..." 
                            className="min-h-[80px] bg-white border-slate-200 resize-y focus:border-[#00A38C] focus:ring-[#00A38C] text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                      <Button 
                          type="submit" 
                          className="w-full bg-[#00A38C] hover:bg-[#008f7a] text-white shadow-lg shadow-[#00A38C]/20 h-10 text-sm font-bold transition-all transform active:scale-[0.98]" 
                          disabled={isLoading}
                      >
                          {isLoading ? (
                          <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
