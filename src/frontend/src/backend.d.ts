import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface DailyOrder {
    weight: string;
    size: string;
    design: string;
    orderNo: string;
    quantity: string;
    remarks: string;
}
export interface KarigarMapping {
    karigar: string;
    designPattern: string;
    factory?: string;
}
export type Date_ = string;
export interface KarigarAssignment {
    karigar: string;
    orderId: string;
    factory?: string;
}
export interface UserProfile {
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    assignKarigar(date: Date_, orderIds: Array<string>, karigar: string, factory: string | null): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDailyOrders(date: Date_): Promise<Array<DailyOrder>>;
    getKarigarAssignments(date: Date_): Promise<Array<KarigarAssignment>>;
    getKarigarMappingWorkbook(): Promise<ExternalBlob | null>;
    getKarigarMappings(): Promise<Array<[string, KarigarMapping]>>;
    getOrdersByKarigar(date: Date_, karigar: string): Promise<Array<DailyOrder>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveKarigarMappingWorkbook(blob: ExternalBlob): Promise<void>;
    storeDailyOrders(date: Date_, orders: Array<DailyOrder>): Promise<void>;
    storeKarigarMappings(mappings: Array<KarigarMapping>): Promise<void>;
}
