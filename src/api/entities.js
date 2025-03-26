import { base44 } from './base44Client';
import { Sale as FirebaseSale, UnfinishedSale as FirebaseUnfinishedSale, Client as FirebaseClient } from '../firebase/entities';

// Entidades do Firebase
export const Client = FirebaseClient;

// Entidades do Base44
export const Appointment = base44.entities.Appointment;
export const FinancialTransaction = base44.entities.FinancialTransaction;
export const CompanySettings = base44.entities.CompanySettings;
export const SlideShowImage = base44.entities.SlideShowImage;
export const Testimonial = base44.entities.Testimonial;
export const Employee = base44.entities.Employee;
export const Service = base44.entities.Service;
export const Product = base44.entities.Product;
export const Package = base44.entities.Package;
export const Supplier = base44.entities.Supplier;
export const Role = base44.entities.Role;
export const PaymentMethod = base44.entities.PaymentMethod;
export const Inventory = base44.entities.Inventory;
export const ClientPackage = base44.entities.ClientPackage;
export const SubscriptionPlan = base44.entities.SubscriptionPlan;
export const ClientSubscription = base44.entities.ClientSubscription;
export const GiftCard = base44.entities.GiftCard;
export const ClientPackageSession = base44.entities.ClientPackageSession;
export const Receipt = base44.entities.Receipt;
export const ClientAuth = base44.entities.ClientAuth;

// Usando as versões do Firebase para vendas
export const Sale = FirebaseSale;
export const UnfinishedSale = FirebaseUnfinishedSale;

// Auth e autenticação
export const User = base44.auth;