// Versões aprimoradas das entidades do Base44 com suporte ao Firebase
import { base44 } from '../api/base44Client';
import { createEnhancedEntity } from './enhancedEntities';

// Cria versões aprimoradas das entidades mais utilizadas
export const Client = createEnhancedEntity('clients', base44.entities.Client);
export const Appointment = createEnhancedEntity('appointments', base44.entities.Appointment);
export const Sale = createEnhancedEntity('sales', base44.entities.Sale);
export const FinancialTransaction = createEnhancedEntity('financial_transactions', base44.entities.FinancialTransaction);

// Exporta as entidades originais para as demais (que serão migradas gradualmente)
export const Employee = base44.entities.Employee;
export const Service = base44.entities.Service;
export const Product = base44.entities.Product;
export const Package = base44.entities.Package;
export const Supplier = base44.entities.Supplier;
export const Inventory = base44.entities.Inventory;
export const ClientPackage = base44.entities.ClientPackage;
export const SubscriptionPlan = base44.entities.SubscriptionPlan;
export const ClientSubscription = base44.entities.ClientSubscription;
export const Role = base44.entities.Role;
export const PaymentMethod = base44.entities.PaymentMethod;
export const GiftCard = base44.entities.GiftCard;
export const ClientPackageSession = base44.entities.ClientPackageSession;
export const Receipt = base44.entities.Receipt;
export const CompanySettings = base44.entities.CompanySettings;
export const SlideShowImage = base44.entities.SlideShowImage;
export const Testimonial = base44.entities.Testimonial;
export const ClientAuth = base44.entities.ClientAuth;
export const UnfinishedSale = base44.entities.UnfinishedSale;

// Auth SDK
export const User = base44.auth;
