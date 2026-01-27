
export type UserRole = 'ADMIN' | 'ALMACEN' | 'MOBILE';

export interface User {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  displayName: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  requiredStock: number | string;
  category: string;
  type: 'MEDICAMENTO' | 'DISPOSITIVO' | 'REACTIVO' | 'INSUMO';
}

export interface DayCheck {
  itemId: string;
  day: number;
  status: 'ok' | 'missing' | 'regular' | 'none'; // ok=B, regular=R, missing=M
  currentStock?: number | string;
  historyNumber?: string;
}

export interface BatchEntry {
  id: string;
  lot: string;
  expiryDate: string;
  quantity?: string;
}

export interface TechnicalInfo {
  fechaRegistro: string;
  descripcion: string;
  marca: string;
  presentacionComercial: string;
  registroInvima: string;
  claseRiesgo: string;
  vidaUtil: string;
  principioActivo?: string;
  formaFarmaceutica?: string;
  concentracion?: string;
  unidadMedida?: string;
  serie?: string;
  batches: BatchEntry[];
}

export interface ClimateReading {
  tempAM: string;
  humAM: string;
  tempPM: string;
  humPM: string;
}

export interface InventoryHeader {
  responsable: string;
  sdsCode: string;
  placa: string;
  mes: string;
  ano: string;
  codigoInterno: string;
  observaciones: string;
  // Campos PESV-FR-01
  marca?: string;
  linea?: string;
  modelo?: string;
  cilindraje?: string;
  kilometrajeInicial?: string;
  vencimientoSoat?: string;
  aseguradora?: string;
  vencimientoTecno?: string;
  cda?: string;
}

export interface InventoryState {
  header: InventoryHeader;
  checks: DayCheck[];
  technicalData: Record<string, TechnicalInfo>;
  climateData: Record<number, ClimateReading>;
  liquidPhotos?: Record<number, string[]>; // Actualizado: Array de fotos de evidencia por día (base64)
  lastSaved?: string;
}

export interface SupplyRequest {
  id: string;
  mobileId: string;
  mobileName: string;
  date: string;
  items: Array<{
    name: string;
    deficit: number;
    current: number | string;
    historyNumber?: string;
  }>;
  status: 'PENDING' | 'COMPLETED';
}
