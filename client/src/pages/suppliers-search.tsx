import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, ArrowUpDown } from "lucide-react";

interface SearchComponentProps {
  onSearch: (query: string) => void;
  onSortToggle: () => void;
  sortOrder: 'asc' | 'desc';
  totalSuppliers: number;
  matchingSuppliers: number;
  searchQuery: string;
}

export function SupplierSearch({
  onSearch,
  onSortToggle,
  sortOrder,
  totalSuppliers,
  matchingSuppliers,
  searchQuery
}: SearchComponentProps) {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name, contact, etc."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSortToggle} 
              className="whitespace-nowrap"
            >
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Sort {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </Button>
          </div>
        </div>
        
        {searchQuery && (
          <div className="mt-3 text-sm text-muted-foreground">
            Showing {matchingSuppliers} of {totalSuppliers} suppliers
            {matchingSuppliers === 0 && (
              <Button variant="link" className="p-0 h-auto ml-2" onClick={() => onSearch("")}>
                Clear search
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
