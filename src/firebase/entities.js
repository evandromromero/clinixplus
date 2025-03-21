// Versões aprimoradas das entidades do Base44 com suporte ao Firebase
import { base44 } from '../api/base44Client';
import { createEnhancedEntity } from './enhancedEntities';

// Cria versões aprimoradas das entidades mais utilizadas
export const Client = createEnhancedEntity('clients', base44.entities.Client);
export const Appointment = createEnhancedEntity('appointments', base44.entities.Appointment);
export const Sale = createEnhancedEntity('sales', base44.entities.Sale);
export const FinancialTransaction = createEnhancedEntity('financial_transactions', base44.entities.FinancialTransaction);
export const CompanySettings = createEnhancedEntity('company_settings', base44.entities.CompanySettings);
export const SlideShowImage = createEnhancedEntity('slideshow_images', base44.entities.SlideShowImage);
export const Testimonial = createEnhancedEntity('testimonials', base44.entities.Testimonial);
export const Employee = createEnhancedEntity('employees', base44.entities.Employee);
export const Service = createEnhancedEntity('services', base44.entities.Service);
export const Product = createEnhancedEntity('products', base44.entities.Product);
export const Package = createEnhancedEntity('packages', base44.entities.Package);
export const Supplier = createEnhancedEntity('suppliers', base44.entities.Supplier);
export const Role = createEnhancedEntity('roles', base44.entities.Role);
export const PaymentMethod = createEnhancedEntity('payment_methods', base44.entities.PaymentMethod);
export const Inventory = createEnhancedEntity('inventory', base44.entities.Inventory);
export const ClientPackage = createEnhancedEntity('client_packages', base44.entities.ClientPackage);
export const SubscriptionPlan = createEnhancedEntity('subscription_plans', base44.entities.SubscriptionPlan);
export const ClientSubscription = createEnhancedEntity('client_subscriptions', base44.entities.ClientSubscription);
export const GiftCard = createEnhancedEntity('gift_cards', base44.entities.GiftCard);
export const ClientPackageSession = createEnhancedEntity('client_package_sessions', base44.entities.ClientPackageSession);
export const Receipt = createEnhancedEntity('receipts', base44.entities.Receipt);
export const UnfinishedSale = createEnhancedEntity('unfinished_sales', base44.entities.UnfinishedSale);

// Exporta as entidades originais para as demais (que serão migradas gradualmente)
export const ClientAuth = base44.entities.ClientAuth;

// Auth SDK
export const User = base44.auth;
