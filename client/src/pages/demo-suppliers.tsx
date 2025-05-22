import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Building } from "lucide-react";

// Mock data to demonstrate the calculation changes
const mockSuppliers = [
  {
    id: 1,
    name: "ABC Wholesalers",
    contactPerson: "John Smith",
    phone: "123-456-7890",
    email: "john@abcwholesalers.com",
    address: "123 Main St, London",
    outstandingAmount: 1250.50,
    branchBalances: {
      1: { name: "London Branch", amount: 850.50 },
      2: { name: "Manchester Branch", amount: 400.00 }
    }
  },
  {
    id: 2,
    name: "XYZ Distribution",
    contactPerson: "Sarah Jones",
    phone: "987-654-3210",
    email: "sarah@xyzdist.com",
    address: "456 High St, Birmingham",
    outstandingAmount: 0, // Paid invoices example
    branchBalances: {
      1: { name: "London Branch", amount: 0 },
      3: { name: "Birmingham Branch", amount: 0 }
    }
  },
  {
    id: 3,
    name: "Global Foods Ltd",
    contactPerson: "Michael Brown",
    email: "michael@globalfoods.com",
    address: "789 Commercial Road, Liverpool",
    outstandingAmount: 3200.75,
    branchBalances: {
      2: { name: "Manchester Branch", amount: 1500.25 },
      4: { name: "Liverpool Branch", amount: 1700.50 }
    }
  }
];

export default function DemoSuppliers() {
  const [suppliers] = useState(mockSuppliers);
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Suppliers (Demo)</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline">Refresh</Button>
          <Button>Add Supplier</Button>
        </div>
      </div>
      
      <div className="text-center mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded">
        <p className="text-yellow-800">
          <strong>Demo Mode:</strong> This is a demonstration page showing the calculation changes for outstanding amounts.
          <br />
          Now only cash invoices and unpaid standard invoices contribute to the outstanding amount.
          <br />
          Paid invoices are excluded from the calculation, and the display will show £0.00 when all invoices are paid.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map((supplier) => (
          <Card key={supplier.id} className="overflow-hidden h-full">
            <CardContent className="p-0">
              <div className="bg-primary text-white p-4">
                <h2 className="text-xl font-bold">{supplier.name}</h2>
                {supplier.contactPerson && (
                  <p className="text-sm opacity-80">{supplier.contactPerson}</p>
                )}
              </div>
              
              <div className="p-4 space-y-3">
                {/* Contact information */}
                <div className="space-y-2">
                  {supplier.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  
                  {supplier.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  
                  {supplier.address && (
                    <div className="flex items-center text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                      <span>{supplier.address}</span>
                    </div>
                  )}
                </div>
                
                {/* Outstanding amount for this supplier */}
                <div className="flex justify-between mt-3 font-medium">
                  <span>Outstanding Amount:</span>
                  <span className={`${supplier.outstandingAmount > 0 ? 'text-destructive' : supplier.outstandingAmount < 0 ? 'text-green-600' : ''}`}>
                    {supplier.outstandingAmount > 0 ? '£' : (supplier.outstandingAmount < 0 ? '-£' : '£')}{Math.abs(supplier.outstandingAmount).toFixed(2)}
                  </span>
                </div>
                
                {/* Branch breakdown */}
                <div className="mt-2">
                  <h4 className="text-sm font-semibold border-b pb-1">Branch Breakdown</h4>
                  
                  {/* Branch balances list */}
                  {supplier.branchBalances && Object.keys(supplier.branchBalances).length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {Object.entries(supplier.branchBalances).map(([branchId, data]: [string, any]) => (
                        <div key={branchId} className="flex justify-between items-center">
                          <span className="text-xs">{data.name}:</span>
                          <span className={`text-xs font-medium ${data.amount > 0 ? 'text-destructive' : data.amount < 0 ? 'text-green-600' : ''}`}>
                            {data.amount > 0 ? '£' : (data.amount < 0 ? '-£' : '£')}{Math.abs(data.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">No branch balances</div>
                  )}
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-between mt-4">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="destructive" size="sm">Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}