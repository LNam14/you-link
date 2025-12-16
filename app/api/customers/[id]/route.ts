import { NextRequest } from "next/server";
import { CustomerService } from "@/lib/services/customer.service";
import { successResponse, errorResponse } from "@/lib/utils/response";
import { verifyAuthToken } from "@/lib/utils/auth";
import { UpdateCustomerDto } from "@/lib/types";

const customerService = new CustomerService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return errorResponse(new Error("Invalid customer ID"), 400);
    }

    const customer = await customerService.getCustomerById(id);
    return successResponse(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return errorResponse(error as Error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id: idParam } = await params;
    const body: UpdateCustomerDto = await request.json();
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return errorResponse(new Error("Invalid customer ID"), 400);
    }

    const updatedCustomer = await customerService.updateCustomer(id, body);
    return successResponse(updatedCustomer);
  } catch (error) {
    console.error("Error updating customer:", error);
    return errorResponse(error as Error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    verifyAuthToken(request);
    
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return errorResponse(new Error("Invalid customer ID"), 400);
    }

    await customerService.deleteCustomer(id);
    return successResponse({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return errorResponse(error as Error);
  }
}

