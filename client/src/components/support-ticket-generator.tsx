import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { LifeBuoy } from "lucide-react";

interface SupportTicketGeneratorProps {
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SupportTicketGenerator({
  variant = "outline",
  size = "default",
  className = "",
}: SupportTicketGeneratorProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickGenerate, setQuickGenerate] = useState(true);
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customAction, setCustomAction] = useState("");

  // Extract the page name from the current location
  const pageContext = location.startsWith('/') 
    ? location.substring(1) || 'home' 
    : location;

  // Function to generate and submit a ticket with one click
  const generateTicket = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Create the request payload
      const payload = {
        pageContext,
        priority,
        userAction: customAction || "User clicked the support button"
      };
      
      // Make API request to create a support ticket
      const response = await fetch('/api/support-tickets/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      toast({
        title: "Support ticket submitted!",
        description: "Our team will address your issue soon.",
        variant: "default",
      });
      
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error creating support ticket",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Function to submit a custom support ticket
  const submitCustomTicket = async () => {
    if (!user || !title.trim()) return;
    
    setLoading(true);
    
    try {
      // Create the request payload
      const payload = {
        title,
        description: description || `User requested support from ${pageContext} page.`,
        branchId: user.branchId,
        status: "open",
        priority,
        userId: user.id
      };
      
      // Make API request to create a support ticket
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      toast({
        title: "Support ticket submitted!",
        description: "Our team will address your issue soon.",
        variant: "default",
      });
      
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
    } catch (error: any) {
      toast({
        title: "Error creating support ticket",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          className={className}
        >
          <LifeBuoy className="h-4 w-4 mr-2" />
          Get Support
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {quickGenerate ? "One-Click Support Request" : "Submit Custom Support Ticket"}
          </DialogTitle>
          <DialogDescription>
            {quickGenerate 
              ? "We'll automatically gather context about your current page to help our support team assist you better."
              : "Provide detailed information about the issue you're experiencing."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex space-x-4 items-center">
            <Button 
              variant={quickGenerate ? "default" : "outline"} 
              onClick={() => setQuickGenerate(true)}
              className="flex-1"
            >
              Quick
            </Button>
            <Button 
              variant={!quickGenerate ? "default" : "outline"} 
              onClick={() => setQuickGenerate(false)}
              className="flex-1"
            >
              Custom
            </Button>
          </div>
          
          {quickGenerate ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={priority} 
                  onValueChange={setPriority}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="action">What were you trying to do? (optional)</Label>
                <Textarea
                  id="action"
                  placeholder="I was trying to create a new invoice when..."
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                />
              </div>
              
              <div className="space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-md">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>Page:</strong> {pageContext}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  <strong>User:</strong> {user?.username}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="title">Ticket Title</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the issue"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide details about your issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={priority} 
                  onValueChange={setPriority}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={quickGenerate ? generateTicket : submitCustomTicket}
            disabled={loading || (!quickGenerate && !title.trim())}
          >
            {loading ? "Submitting..." : "Submit Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}