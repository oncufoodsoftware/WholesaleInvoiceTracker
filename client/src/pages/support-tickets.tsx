import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SupportTicketGenerator } from "@/components/support-ticket-generator";
import { Loader2, Search, Filter, LifeBuoy, MoreHorizontal } from "lucide-react";

// This page displays all submitted support tickets and allows managing them
export default function SupportTickets() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewingTicket, setViewingTicket] = useState<any>(null);
  const [updatingTicket, setUpdatingTicket] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch tickets based on filters
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['/api/support-tickets', statusFilter],
    queryFn: async ({ queryKey }) => {
      try {
        const url = statusFilter && statusFilter !== 'all'
          ? `/api/support-tickets?status=${statusFilter}` 
          : '/api/support-tickets';
        
        const response = await fetch(url, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tickets: ${response.status}`);
        }
        
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching tickets:", error);
        return [];
      }
    }
  });

  // Filter tickets by search term
  const filteredTickets = tickets.filter((ticket: any) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      ticket.title?.toLowerCase().includes(searchTermLower) ||
      ticket.description?.toLowerCase().includes(searchTermLower)
    );
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-500";
      case "in_progress":
        return "bg-yellow-500";
      case "resolved":
        return "bg-green-500";
      case "closed":
        return "bg-gray-500";
      default:
        return "bg-slate-500";
    }
  };

  // Get priority badge color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-600";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-blue-500";
      default:
        return "bg-slate-500";
    }
  };

  // Update ticket handler for status changes
  const handleUpdateTicket = async () => {
    if (!updatingTicket) return;
    
    setIsUpdating(true);
    
    try {
      const options = {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: updatingTicket.status
        }),
      };
      
      await fetch(`/api/support-tickets/${updatingTicket.id}`, options);
      
      // Invalidate the cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      
      toast({
        title: "Ticket Updated",
        description: "The support ticket has been updated successfully.",
      });
      
      setUpdatingTicket(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update the support ticket.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  // One-click priority update handler
  const handleUpdatePriority = async (ticketId: number, newPriority: string) => {
    try {
      const options = {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priority: newPriority
        }),
      };
      
      await fetch(`/api/support-tickets/${ticketId}`, options);
      
      // Invalidate the cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      
      toast({
        title: "Priority Updated",
        description: `Ticket priority set to ${newPriority}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket priority.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground">
            View and manage customer support requests
          </p>
        </div>
        <div className="flex gap-2">
          <SupportTicketGenerator />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Ticket Management</CardTitle>
          <CardDescription>
            Handle support tickets and track customer issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search tickets..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-12 text-center">
              <LifeBuoy className="mx-auto h-12 w-12 text-muted-foreground/60" />
              <h3 className="mt-4 text-lg font-semibold">No support tickets found</h3>
              <p className="text-muted-foreground mt-2">
                {searchTerm || statusFilter
                  ? "Try adjusting your search or filter criteria"
                  : "Create a new support ticket using the button above"}
              </p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket: any) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">#{ticket.id}</TableCell>
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full h-6 w-6"
                              onClick={() => {
                                const menu = document.getElementById(`priority-menu-${ticket.id}`);
                                if (menu) {
                                  menu.classList.toggle('hidden');
                                }
                              }}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                            
                            <div 
                              id={`priority-menu-${ticket.id}`}
                              className="absolute right-0 mt-1 w-36 z-10 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-200 dark:border-slate-800 py-1 hidden"
                              onMouseLeave={(e) => {
                                e.currentTarget.classList.add('hidden');
                              }}
                            >
                              <p className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400 border-b border-slate-200 dark:border-slate-700">Change priority:</p>
                              <button
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center gap-2"
                                onClick={() => {
                                  handleUpdatePriority(ticket.id, 'low');
                                  document.getElementById(`priority-menu-${ticket.id}`)?.classList.add('hidden');
                                }}
                              >
                                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                                Low
                              </button>
                              <button
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center gap-2"
                                onClick={() => {
                                  handleUpdatePriority(ticket.id, 'medium');
                                  document.getElementById(`priority-menu-${ticket.id}`)?.classList.add('hidden');
                                }}
                              >
                                <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                                Medium
                              </button>
                              <button
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center gap-2"
                                onClick={() => {
                                  handleUpdatePriority(ticket.id, 'high');
                                  document.getElementById(`priority-menu-${ticket.id}`)?.classList.add('hidden');
                                }}
                              >
                                <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                                High
                              </button>
                              <button
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center gap-2"
                                onClick={() => {
                                  handleUpdatePriority(ticket.id, 'critical');
                                  document.getElementById(`priority-menu-${ticket.id}`)?.classList.add('hidden');
                                }}
                              >
                                <span className="h-2 w-2 rounded-full bg-red-600"></span>
                                Critical
                              </button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {ticket.userId}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingTicket(ticket)}
                              >
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[600px]">
                              <DialogHeader>
                                <DialogTitle>Support Ticket #{viewingTicket?.id}</DialogTitle>
                                <DialogDescription>
                                  Created on {viewingTicket?.createdAt && format(new Date(viewingTicket.createdAt), "PPP")}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1">
                                      <Badge className={getStatusColor(viewingTicket?.status)}>
                                        {viewingTicket?.status?.replace("_", " ")}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Priority</Label>
                                    <div className="mt-1">
                                      <Badge className={getPriorityColor(viewingTicket?.priority)}>
                                        {viewingTicket?.priority}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <Label className="text-muted-foreground">Title</Label>
                                  <p className="font-medium">{viewingTicket?.title}</p>
                                </div>
                                
                                <div>
                                  <Label className="text-muted-foreground">Description</Label>
                                  <div className="mt-1 rounded bg-slate-50 dark:bg-slate-900 p-3 text-sm whitespace-pre-line">
                                    {viewingTicket?.description}
                                  </div>
                                </div>
                              </div>
                              
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setUpdatingTicket(viewingTicket);
                                    setViewingTicket(null);
                                  }}
                                >
                                  Update Status
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setUpdatingTicket(ticket)}
                          >
                            Update
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Ticket Dialog */}
      {updatingTicket && (
        <Dialog open={!!updatingTicket} onOpenChange={(open) => !open && setUpdatingTicket(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Update Ticket Status</DialogTitle>
              <DialogDescription>
                Change the status of ticket #{updatingTicket.id}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={updatingTicket.status}
                  onValueChange={(value) => setUpdatingTicket({...updatingTicket, status: value})}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setUpdatingTicket(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTicket}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Ticket"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}