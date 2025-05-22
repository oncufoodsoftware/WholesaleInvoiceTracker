import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Mail, MapPin } from "lucide-react";

// Demo component showing the calculation changes without requiring authentication
export default function Demo() {
  // Mock suppliers to demonstrate the calculation changes
  const suppliers = [
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
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Supplier Calculation Demo</h1>
      </div>
      
      <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded mb-6">
        <p className="text-yellow-800">
          <strong>Changes Made to Calculations:</strong>
          <ul className="list-disc pl-5 mt-2">
            <li>Only cash invoices and unpaid standard invoices contribute to the outstanding amount</li>
            <li>Paid invoices are completely excluded from the calculation</li>
            <li>When all invoices are paid, the amount displays as £0.00</li>
          </ul>
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-slate-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Implementation Details</h2>
        <div className="bg-slate-700 text-white p-3 rounded text-sm overflow-x-auto">
          <code>
            {`// When calculating supplier balances:
if (invoice.type === 'cash' || (invoice.type === 'standard' && invoice.status !== 'paid')) {
  // Include in outstanding amount
  outstandingAmount += invoice.amount - invoice.paidAmount;
}
// Paid standard invoices and credit notes are handled differently`}
          </code>
        </div>
      </div>
    </div>
  );
}