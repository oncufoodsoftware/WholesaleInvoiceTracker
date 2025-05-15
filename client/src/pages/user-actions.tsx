import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UserAction } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, FileIcon, User, Package, Building, FileText, CreditCard } from "lucide-react";

export default function UserActions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [entityType, setEntityType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  // Get all user actions
  const {
    data: actions = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<UserAction[]>({
    queryKey: ["/api/user-actions", entityType, limit],
    queryFn: async () => {
      const url = entityType === "all" 
        ? `/api/user-actions?limit=${limit}`
        : `/api/user-actions/entity/${entityType}?limit=${limit}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch user actions");
      return res.json();
    },
  });

  // Filter actions based on search query
  const filteredActions = searchQuery
    ? actions.filter((action) => {
        const details = action.details ? JSON.stringify(action.details).toLowerCase() : "";
        return (
          details.includes(searchQuery.toLowerCase()) ||
          action.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          action.actionType.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (action.entityId && action.entityId.toString().includes(searchQuery))
        );
      })
    : actions;

  function getActionTypeColor(type: string): string {
    switch (type) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      case "login":
        return "bg-purple-100 text-purple-800";
      case "logout":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getEntityIcon(entityType: string) {
    switch (entityType) {
      case "users":
        return <User className="w-4 h-4 mr-1" />;
      case "suppliers":
        return <Package className="w-4 h-4 mr-1" />;
      case "branches":
        return <Building className="w-4 h-4 mr-1" />;
      case "invoices":
        return <FileText className="w-4 h-4 mr-1" />;
      case "financial_transactions":
        return <CreditCard className="w-4 h-4 mr-1" />;
      default:
        return <FileIcon className="w-4 h-4 mr-1" />;
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Actions Log</h1>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Actions Filter</CardTitle>
          <CardDescription>Filter user actions by type or search for specific content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select
                value={entityType}
                onValueChange={(value) => setEntityType(value)}
              >
                <SelectTrigger id="entity-type">
                  <SelectValue placeholder="Select entity type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  <SelectItem value="users">Users</SelectItem>
                  <SelectItem value="branches">Branches</SelectItem>
                  <SelectItem value="suppliers">Suppliers</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="financial_transactions">Financial Transactions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(parseInt(value))}
              >
                <SelectTrigger id="limit">
                  <SelectValue placeholder="Select limit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 entries</SelectItem>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                  <SelectItem value="200">200 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search in action details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Actions</CardTitle>
          <CardDescription>
            Showing {filteredActions.length} {filteredActions.length === 1 ? "action" : "actions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="text-center py-8 text-destructive">
              Error loading user actions. Please try again.
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No actions found with the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action) => {
                    // Parse details if they exist
                    let parsedDetails: any = {};
                    try {
                      if (action.details) {
                        parsedDetails = JSON.parse(action.details);
                      }
                    } catch (e) {
                      parsedDetails = { error: "Invalid JSON", raw: action.details };
                    }

                    return (
                      <TableRow key={action.id}>
                        <TableCell className="whitespace-nowrap">
                          {action.timestamp
                            ? format(new Date(action.timestamp), "MMM dd, yyyy HH:mm:ss")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {parsedDetails.username || `User ${action.userId}`}
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionTypeColor(action.actionType)}>
                            {action.actionType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {getEntityIcon(action.entityType)}
                            {action.entityType}
                          </div>
                        </TableCell>
                        <TableCell>{action.entityId || "N/A"}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {action.details ? (
                            <div className="truncate max-w-xs" title={action.details}>
                              {action.details.substring(0, 50)}
                              {action.details.length > 50 ? "..." : ""}
                            </div>
                          ) : (
                            "No details"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}