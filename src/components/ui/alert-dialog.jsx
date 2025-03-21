import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Recriar como um wrapper em torno do Dialog para manter a interface compatível
export function AlertDialog({ children, ...props }) {
  return <Dialog {...props}>{children}</Dialog>
}

export function AlertDialogTrigger({ children, ...props }) {
  return <DialogTrigger {...props}>{children}</DialogTrigger>
}

export function AlertDialogContent({ children, ...props }) {
  return <DialogContent {...props}>{children}</DialogContent>
}

export function AlertDialogHeader({ children, ...props }) {
  return <DialogHeader {...props}>{children}</DialogHeader>
}

export function AlertDialogTitle({ children, ...props }) {
  return <DialogTitle {...props}>{children}</DialogTitle>
}

export function AlertDialogDescription({ children, ...props }) {
  return <DialogDescription {...props}>{children}</DialogDescription>
}

export function AlertDialogFooter({ children, ...props }) {
  return <DialogFooter {...props}>{children}</DialogFooter>
}

export function AlertDialogAction({ children, ...props }) {
  return <Button {...props}>{children}</Button>
}

export function AlertDialogCancel({ children, ...props }) {
  return (
    <Button variant="outline" {...props}>
      {children}
    </Button>
  )
}