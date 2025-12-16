export interface Customer {
  id: number;
  ma_moi: string;
  ma_cu: string;
  phan_loai: string;
  phien_ban: string;
  order: string;
  cty: string;
  team: string;
  chuc_vu: string;
  ten: string;
  id_tele: string;
  lien_he_2: string;
  link_nhom: string;
  id_nhom: string;
  info: string;
  ng_cham_1: string;
  ng_cham_2: string;
  tab_don: string;
  cong_no: string; // Sẽ được lấy từ Google Sheets
  tin_dung: string;
  tinh_trang: string;
  ngay_check: string | null;
  dem_ngay: string;
  note_kt: string;
  nguoi_xem: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCustomerDto {
  ma_moi?: string;
  ma_cu?: string;
  phan_loai?: string;
  phien_ban?: string;
  order?: string;
  cty?: string;
  team?: string;
  chuc_vu?: string;
  ten?: string;
  id_tele?: string;
  lien_he_2?: string;
  link_nhom?: string;
  id_nhom?: string;
  info?: string;
  ng_cham_1?: string;
  ng_cham_2?: string;
  tab_don?: string;
  cong_no?: string;
  tin_dung?: string;
  tinh_trang?: string;
  ngay_check?: string | null;
  dem_ngay?: string;
  note_kt?: string;
  nguoi_xem?: string;
}

export interface UpdateCustomerDto {
  ma_moi?: string;
  ma_cu?: string;
  phan_loai?: string;
  phien_ban?: string;
  order?: string;
  cty?: string;
  team?: string;
  chuc_vu?: string;
  ten?: string;
  id_tele?: string;
  lien_he_2?: string;
  link_nhom?: string;
  id_nhom?: string;
  info?: string;
  ng_cham_1?: string;
  ng_cham_2?: string;
  tab_don?: string;
  cong_no?: string;
  tin_dung?: string;
  tinh_trang?: string;
  ngay_check?: string | null;
  dem_ngay?: string;
  note_kt?: string;
  nguoi_xem?: string;
}

export interface CustomerResponse {
  id: number;
  ma_moi: string;
  ma_cu: string;
  phan_loai: string;
  phien_ban: string;
  order: string;
  cty: string;
  team: string;
  chuc_vu: string;
  ten: string;
  id_tele: string;
  lien_he_2: string;
  link_nhom: string;
  id_nhom: string;
  info: string;
  ng_cham_1: string;
  ng_cham_2: string;
  tab_don: string;
  cong_no: string;
  tin_dung: string;
  tinh_trang: string;
  ngay_check: string | null;
  dem_ngay: string;
  note_kt: string;
  nguoi_xem: string;
  createdAt?: string;
  updatedAt?: string;
}

