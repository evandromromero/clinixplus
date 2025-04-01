import { db } from '../firebase/config';
import { collection, doc, getDoc, getDocs, setDoc, query, where, addDoc } from 'firebase/firestore';

/**
 * Script para reparar o cargo de Administrador Geral e atribuí-lo ao usuário atual
 * Este script pode ser executado manualmente quando necessário
 */
export const repairAdminRole = async () => {
  try {
    console.log('Iniciando reparo do cargo Administrador Geral...');
    
    // 1. Verificar se o cargo Administrador Geral já existe
    const rolesRef = collection(db, 'roles');
    const q = query(rolesRef, where('name', '==', 'Administrador Geral'));
    const querySnapshot = await getDocs(q);
    
    let adminRoleId;
    
    // 2. Se não existir, criar o cargo
    if (querySnapshot.empty) {
      console.log('Cargo Administrador Geral não encontrado. Criando...');
      
      const adminRoleData = {
        name: 'Administrador Geral',
        permissions: [
          'admin', 
          'manage_users', 
          'manage_roles', 
          'manage_clients', 
          'manage_appointments', 
          'manage_services', 
          'manage_products', 
          'manage_sales', 
          'manage_finances', 
          'manage_settings',
          'manage_subscriptions', 
          'manage_gift_cards'
        ],
        default: true,
        department: 'Administração',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active: true
      };
      
      const docRef = await addDoc(rolesRef, adminRoleData);
      adminRoleId = docRef.id;
      console.log(`Cargo Administrador Geral criado com ID: ${adminRoleId}`);
    } else {
      // Cargo já existe, pegar o ID
      adminRoleId = querySnapshot.docs[0].id;
      console.log(`Cargo Administrador Geral encontrado com ID: ${adminRoleId}`);
    }
    
    // 3. Atualizar o usuário atual com o cargo de Administrador Geral
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      userData.roleId = adminRoleId;
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('Usuário atualizado com o cargo Administrador Geral no localStorage');
      
      // 4. Se o usuário existir no Firestore, atualizar lá também
      if (userData.id) {
        const userRef = doc(db, 'users', userData.id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          await setDoc(userRef, { roleId: adminRoleId }, { merge: true });
          console.log('Usuário atualizado no Firestore');
        }
      }
      
      // 5. Recarregar a página para aplicar as alterações
      console.log('Recarregando a página para aplicar as alterações...');
      window.location.reload();
    } else {
      console.log('Nenhum usuário encontrado no localStorage');
    }
    
    console.log('Reparo do cargo Administrador Geral concluído com sucesso');
    return adminRoleId;
  } catch (error) {
    console.error('Erro ao reparar cargo Administrador Geral:', error);
    throw error;
  }
};

export default repairAdminRole;
