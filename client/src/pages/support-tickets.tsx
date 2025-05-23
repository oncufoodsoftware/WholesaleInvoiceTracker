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
import { Loader2, Search, Filter, LifeBuoy } from "lucide-react";

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
    queryFn: async () => {
      const url = statusFilter 
        ? `/api/support-tickets?status=${statusFilter}` 
        : '/api/support-tickets';
      
      const response = await apiRequest(url);
      return response;
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

  // Update ticket status handler
  const handleUpdateTicket = async () => {
    if (!updatingTicket) return;
    
    setIsUpdating(true);
    
    try {
      await apiRequest(`/api/support-tickets/${updatingTicket.id}`, {
        method: 'patch',
        body: JSON.stringify({
          status: updatingTicket.status
        }),
      });
      
      // Invalidate the cache to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/support-tickets'] });
      
      toast({
        title: "Ticket Updated",
        description: "The support ticket has been updated successfully.",
      });
      
      setUpdatingTicket(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update the support ticket.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
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
                  <SelectItem value="">All Statuses</SelectItem>
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
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
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