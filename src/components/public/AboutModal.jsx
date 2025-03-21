import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function AboutModal({ title, description, children }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-[#294380] hover:bg-[#0D0F36]">
          Saiba mais
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#0D0F36]">{title}</DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </DialogHeader>
        <DialogDescription className="text-base text-gray-700 leading-relaxed">
          {description}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}