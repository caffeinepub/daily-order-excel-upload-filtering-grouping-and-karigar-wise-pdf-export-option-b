import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Date_ = string;
export interface Order {
    design: string;
    orderId: string;
    product: string;
}
export interface UserProfile {
    name: string;
}
export interface KarigarAssignment {
    karigar: string;
    orderId: string;
    factory?: string;
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
    getDailyOrders(date: Date_): Promise<Array<Order>>;
    getKarigarAssignments(date: Date_): Promise<Array<KarigarAssignment>>;
    getKarigarAssignmentsForDesign(design: string): Promise<Array<[string, string]>>;
    getKarigarForDesign(sheetName: string, design: string): Promise<string | null>;
    getKarigarMappingSheet(sheetName: string): Promise<Array<[string, string]> | null>;
    getKarigarMappingWorkbook(): Promise<Array<[string, Array<[string, string]>]>>;
    getOrdersByKarigar(date: Date_, karigar: string): Promise<Array<Order>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveKarigarMappingWorkbook(workbook: Array<[string, Array<[string, string]>]>): Promise<void>;
    storeDailyOrders(date: Date_, orders: Array<Order>): Promise<void>;
}
