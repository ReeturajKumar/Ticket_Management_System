import { UserPlus, Ticket } from "lucide-react"

export function FormHeader() {
  return (
    <>
      {/* Mobile Logo - Only visible on small screens */}
      <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Ticket className="size-5 text-primary" />
        </div>
        <h1 className="text-xl font-bold">Student Ticketing</h1>
      </div>

      {/* Form Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
          <UserPlus className="size-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Join our student support platform
        </p>
      </div>
    </>
  )
}
