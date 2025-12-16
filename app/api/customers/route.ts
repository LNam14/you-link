import { NextRequest } from "next/server";
import { CustomerService } from "@/lib/services/customer.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { CreateCustomerDto } from "@/lib/types";

const customerService = new CustomerService();

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);
    
    const customers = await customerService.getAllCustomers();
    return successResponse(customers);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return errorResponse(error as Error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    verifyAuthToken(request);
    
    const body: CreateCustomerDto = await request.json();
    
    const newCustomer = await customerService.createCustomer(body);
    return successResponse(newCustomer, 201);
  } catch (error) {
    console.error("Error creating customer:", error);
    return errorResponse(error as Error);
  }
}

