// shadcn/ui NativeSelect: a styled native <select>. shadcn's own Select is built on Radix (not
// installed); the native one is the most accessible list there is, with the phone's own picker.
import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "../../lib/utils";

function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full" data-slot="native-select-wrapper">
      <select
        data-slot="native-select"
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

export { NativeSelect };
