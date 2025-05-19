import React, { createContext, useContext, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Criar contexto para o modal de assinatura
const SignatureModalContext = createContext();

// Provedor do contexto
export function SignatureModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [signature, setSignature] = useState(null);

  const openModal = (signatureData) => {
    setSignature(signatureData);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
  };

  return (
    <SignatureModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <SignatureModal isOpen={isOpen} onClose={closeModal} signature={signature} />
    </SignatureModalContext.Provider>
  );
}

// Hook para usar o contexto
export function useSignatureModal() {
  const context = useContext(SignatureModalContext);
  if (!context) {
    throw new Error('useSignatureModal must be used within a SignatureModalProvider');
  }
  return context;
}

// Componente do modal
function SignatureModal({ isOpen, onClose, signature }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assinatura do Cliente</DialogTitle>
          <DialogDescription>
            Assinatura capturada na conclusão do agendamento.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-md">
          {signature ? (
            <img 
              src={signature} 
              alt="Assinatura do cliente" 
              className="max-h-48 max-w-full"
            />
          ) : (
            <p className="text-gray-500">Assinatura não disponível</p>
          )}
        </div>
        <DialogFooter className="sm:justify-center">
          <Button 
            variant="secondary" 
            onClick={onClose}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
