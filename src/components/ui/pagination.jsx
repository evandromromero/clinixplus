import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

function cn(...classes) {
  return classes.filter(Boolean).join(" ")
}

const Pagination = ({ className, ...props }) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}) => {
  const baseStyles = isActive 
    ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground" 
    : "";
  
  return (
    <Button
      variant={isActive ? "outline" : "ghost"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      className={cn(baseStyles, className)}
      {...props}
    />
  );
}
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  onClick,
  disabled,
  ...props
}) => (
  <PaginationItem>
    <Button
      variant="ghost"
      size="default"
      aria-label="Go to previous page"
      className={cn("gap-1 pl-2.5", className, disabled && "pointer-events-none opacity-50")}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Anterior</span>
    </Button>
  </PaginationItem>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  onClick,
  disabled,
  ...props
}) => (
  <PaginationItem>
    <Button
      variant="ghost"
      size="default"
      aria-label="Go to next page"
      className={cn("gap-1 pr-2.5", className, disabled && "pointer-events-none opacity-50")}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      {...props}
    >
      <span>Próximo</span>
      <ChevronRight className="h-4 w-4" />
    </Button>
  </PaginationItem>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}