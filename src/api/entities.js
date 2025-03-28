import { base44 } from './base44Client';
import { 
  Sale as FirebaseSale, 
  UnfinishedSale as FirebaseUnfinishedSale, 
  Client as FirebaseClient,
  Appointment as FirebaseAppointment,
  Employee as FirebaseEmployee,
  Product as FirebaseProduct,
  Inventory as FirebaseInventory
} from '../firebase/entities';

// Entidades do Firebase
export const Client = FirebaseClient;
export const Appointment = FirebaseAppointment; // Usando a versão do Firebase
export const Employee = FirebaseEmployee; // Usando a versão do Firebase
export const Product = FirebaseProduct; // Usando a versão do Firebase
export const Inventory = FirebaseInventory; // Usando a versão do Firebase

// Entidades do Base44
// export const Appointment = base44.entities.Appointment; // Comentado para usar a versão do Firebase
export const FinancialTransaction = base44.entities.FinancialTransaction;
export const CompanySettings = base44.entities.CompanySettings;
export const SlideShowImage = base44.entities.SlideShowImage;
export const Testimonial = base44.entities.Testimonial;
// export const Employee = base44.entities.Employee; // Comentado para usar a versão do Firebase
export const Service = base44.entities.Service;
// export const Product = base44.entities.Product; // Comentado para usar a versão do Firebase
export const Package = base44.entities.Package;
export const Supplier = base44.entities.Supplier;
export const Role = base44.entities.Role;
export const PaymentMethod = base44.entities.PaymentMethod;
// export const Inventory = base44.entities.Inventory; // Comentado para usar a versão do Firebase
export const Sale = FirebaseSale;
export const UnfinishedSale = FirebaseUnfinishedSale;

// Auth e autenticação
export const User = base44.auth;
export const ClientPackage = base44.entities.ClientPackage;
export const SubscriptionPlan = base44.entities.SubscriptionPlan;
export const ClientSubscription = base44.entities.ClientSubscription;
export const GiftCard = base44.entities.GiftCard;
export const ClientPackageSession = base44.entities.ClientPackageSession;
export const Receipt = base44.entities.Receipt;
export const ClientAuth = base44.entities.ClientAuth;