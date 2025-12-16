import { CustomerRepository } from "../repositories/customer.repository";
import { Customer, CreateCustomerDto, UpdateCustomerDto, CustomerResponse } from "../types";
import { NotFoundError } from "../utils/errors";
import { getCurrentDateTime } from "../utils/date";

export class CustomerService {
  private customerRepository: CustomerRepository;

  constructor() {
    this.customerRepository = new CustomerRepository();
  }

  async getAllCustomers(): Promise<CustomerResponse[]> {
    const customers = await this.customerRepository.findAll();
    return customers.map(this.formatCustomer);
  }

  async getCustomerById(id: number): Promise<CustomerResponse> {
    const customer = await this.customerRepository.findById(id);
    if (!customer) {
      throw new NotFoundError("Customer");
    }
    return this.formatCustomer(customer);
  }

  async createCustomer(customerData: CreateCustomerDto): Promise<CustomerResponse> {
    const nextId = await this.customerRepository.getNextId();
    const newCustomer: Customer = {
      id: nextId,
      ma_moi: String(customerData.ma_moi || "").trim(),
      ma_cu: String(customerData.ma_cu || "").trim(),
      phan_loai: String(customerData.phan_loai || "").trim(),
      phien_ban: String(customerData.phien_ban || "").trim(),
      order: String(customerData.order || "").trim(),
      cty: String(customerData.cty || "").trim(),
      team: String(customerData.team || "").trim(),
      chuc_vu: String(customerData.chuc_vu || "").trim(),
      ten: String(customerData.ten || "").trim(),
      id_tele: String(customerData.id_tele || "").trim(),
      lien_he_2: String(customerData.lien_he_2 || "").trim(),
      link_nhom: String(customerData.link_nhom || "").trim(),
      id_nhom: String(customerData.id_nhom || "").trim(),
      info: String(customerData.info || "").trim(),
      ng_cham_1: String(customerData.ng_cham_1 || "").trim(),
      ng_cham_2: String(customerData.ng_cham_2 || "").trim(),
      tab_don: String(customerData.tab_don || "").trim(),
      cong_no: String(customerData.cong_no || "").trim(),
      tin_dung: String(customerData.tin_dung || "").trim(),
      tinh_trang: String(customerData.tinh_trang || "").trim(),
      ngay_check: customerData.ngay_check || null,
      dem_ngay: String(customerData.dem_ngay || "").trim(),
      note_kt: String(customerData.note_kt || "").trim(),
      nguoi_xem: String(customerData.nguoi_xem || "").trim(),
      createdAt: getCurrentDateTime(),
      updatedAt: getCurrentDateTime(),
    };

    await this.customerRepository.create(newCustomer, nextId);
    return this.formatCustomer(newCustomer);
  }

  async updateCustomer(id: number, customerData: Partial<CreateCustomerDto>): Promise<CustomerResponse> {
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new NotFoundError("Customer");
    }

    const updateData: any = {};
    if (customerData.ma_moi !== undefined) updateData.ma_moi = String(customerData.ma_moi || "").trim();
    if (customerData.ma_cu !== undefined) updateData.ma_cu = String(customerData.ma_cu || "").trim();
    if (customerData.phan_loai !== undefined) updateData.phan_loai = String(customerData.phan_loai || "").trim();
    if (customerData.phien_ban !== undefined) updateData.phien_ban = String(customerData.phien_ban || "").trim();
    if (customerData.order !== undefined) updateData.order = String(customerData.order || "").trim();
    if (customerData.cty !== undefined) updateData.cty = String(customerData.cty || "").trim();
    if (customerData.team !== undefined) updateData.team = String(customerData.team || "").trim();
    if (customerData.chuc_vu !== undefined) updateData.chuc_vu = String(customerData.chuc_vu || "").trim();
    if (customerData.ten !== undefined) updateData.ten = String(customerData.ten || "").trim();
    if (customerData.id_tele !== undefined) updateData.id_tele = String(customerData.id_tele || "").trim();
    if (customerData.lien_he_2 !== undefined) updateData.lien_he_2 = String(customerData.lien_he_2 || "").trim();
    if (customerData.link_nhom !== undefined) updateData.link_nhom = String(customerData.link_nhom || "").trim();
    if (customerData.id_nhom !== undefined) updateData.id_nhom = String(customerData.id_nhom || "").trim();
    if (customerData.info !== undefined) updateData.info = String(customerData.info || "").trim();
    if (customerData.ng_cham_1 !== undefined) updateData.ng_cham_1 = String(customerData.ng_cham_1 || "").trim();
    if (customerData.ng_cham_2 !== undefined) updateData.ng_cham_2 = String(customerData.ng_cham_2 || "").trim();
    if (customerData.tab_don !== undefined) updateData.tab_don = String(customerData.tab_don || "").trim();
    if (customerData.cong_no !== undefined) updateData.cong_no = String(customerData.cong_no || "").trim();
    if (customerData.tin_dung !== undefined) updateData.tin_dung = String(customerData.tin_dung || "").trim();
    if (customerData.tinh_trang !== undefined) updateData.tinh_trang = String(customerData.tinh_trang || "").trim();
    if (customerData.ngay_check !== undefined) updateData.ngay_check = customerData.ngay_check || null;
    if (customerData.dem_ngay !== undefined) updateData.dem_ngay = String(customerData.dem_ngay || "").trim();
    if (customerData.note_kt !== undefined) updateData.note_kt = String(customerData.note_kt || "").trim();
    if (customerData.nguoi_xem !== undefined) updateData.nguoi_xem = String(customerData.nguoi_xem || "").trim();

    const updatedCustomer = await this.customerRepository.update(id, updateData);
    return this.formatCustomer(updatedCustomer as Customer);
  }

  async deleteCustomer(id: number): Promise<void> {
    const existingCustomer = await this.customerRepository.findById(id);
    if (!existingCustomer) {
      throw new NotFoundError("Customer");
    }

    await this.customerRepository.delete(id);
  }

  private formatCustomer(customer: Customer): CustomerResponse {
    return {
      id: customer.id,
      ma_moi: customer.ma_moi,
      ma_cu: customer.ma_cu,
      phan_loai: customer.phan_loai,
      phien_ban: customer.phien_ban,
      order: customer.order,
      cty: customer.cty,
      team: customer.team,
      chuc_vu: customer.chuc_vu,
      ten: customer.ten,
      id_tele: customer.id_tele,
      lien_he_2: customer.lien_he_2,
      link_nhom: customer.link_nhom,
      id_nhom: customer.id_nhom,
      info: customer.info,
      ng_cham_1: customer.ng_cham_1,
      ng_cham_2: customer.ng_cham_2,
      tab_don: customer.tab_don,
      cong_no: customer.cong_no,
      tin_dung: customer.tin_dung,
      tinh_trang: customer.tinh_trang,
      ngay_check: customer.ngay_check,
      dem_ngay: customer.dem_ngay,
      note_kt: customer.note_kt,
      nguoi_xem: customer.nguoi_xem,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}

