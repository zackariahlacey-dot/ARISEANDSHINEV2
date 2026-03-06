import * as React from "react";
import Link from "next/link";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

const TILT_MAX = 10;
const SHIMMER_OFFSET_FACTOR = 2;

const springTransition = {
  type: "spring" as const,
  stiffness: 150,
  damping: 20,
};

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transition-all duration-500 ease-in-out",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors",
        primary:
          "btn-primary-gold-shimmer bg-[#d4af37] text-black hover:text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-[1.03] active:scale-[0.98] disabled:hover:scale-100 overflow-hidden",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors",
        outline:
          "btn-interaction-shimmer border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors",
        secondary:
          "btn-interaction-shimmer btn-secondary-gold-hover border-2 border-white/20 bg-transparent text-white shadow-sm hover:border-[#d4af37]/60 transition-colors",
        ghost:
          "btn-interaction-shimmer hover:bg-accent hover:text-accent-foreground transition-colors",
        link: "text-primary underline-offset-4 hover:underline transition-colors",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 font-semibold tracking-wide",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
    compoundVariants: [
      {
        variant: ["primary", "secondary", "outline"],
        size: "default",
        class: "h-12 px-8 rounded-xl font-semibold tracking-wide",
      },
    ],
  },
);

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "href">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** When set with variant="primary", renders as Link with full primary styling (shimmer + tilt). */
  href?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, href, onMouseMove, onMouseLeave, onMouseEnter, ...props }, ref) => {
    const isPrimaryLink = !!(href && variant === "primary");
    const ButtonOrSlot = asChild ? Slot : "button";
    const isPrimaryTilt = variant === "primary" && (!asChild || !!href);

    const [isHovered, setIsHovered] = React.useState(false);
    const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

    const handleMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseMove?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        if (!isPrimaryTilt) return;
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        const xNorm = (e.clientX - rect.left) / rect.width - 0.5;
        const yNorm = (e.clientY - rect.top) / rect.height - 0.5;
        setTilt({
          x: -yNorm * TILT_MAX,
          y: xNorm * TILT_MAX,
        });
      },
      [isPrimaryTilt, onMouseMove]
    );

    const handleMouseLeave = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseLeave?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        if (isPrimaryTilt) {
          setIsHovered(false);
          setTilt({ x: 0, y: 0 });
        }
      },
      [isPrimaryTilt, onMouseLeave]
    );

    const handleMouseEnter = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onMouseEnter?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        if (isPrimaryTilt) setIsHovered(true);
      },
      [isPrimaryTilt, onMouseEnter]
    );

    const buttonContent = (
      <>
        {isPrimaryTilt && (
          <div
            className="btn-primary-gold-shimmer-layer"
            style={
              {
                "--shimmer-tx": -tilt.y * SHIMMER_OFFSET_FACTOR,
                "--shimmer-ty": -tilt.x * SHIMMER_OFFSET_FACTOR,
              } as React.CSSProperties
            }
            aria-hidden
          >
            <div className="btn-primary-gold-shimmer-layer-inner" />
          </div>
        )}
        {props.children}
      </>
    );

    const sharedClassName = cn(
      buttonVariants({ variant, size, className }),
      isPrimaryTilt && "btn-primary-gold-shimmer-tilt"
    );
    const buttonEl = isPrimaryLink ? (
      <Link
        href={href!}
        className={sharedClassName}
        onClick={props.onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {isPrimaryTilt ? buttonContent : props.children}
      </Link>
    ) : (
      <ButtonOrSlot
        className={sharedClassName}
        ref={ref}
        {...props}
      >
        {isPrimaryTilt ? buttonContent : props.children}
      </ButtonOrSlot>
    );

    if (isPrimaryTilt) {
      return (
        <motion.div
          className="inline-flex"
          style={{ perspective: 1000 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseEnter={handleMouseEnter}
        >
          <motion.div
            className="inline-flex"
            style={{
              rotateX: isHovered ? tilt.x : 0,
              rotateY: isHovered ? tilt.y : 0,
              transformStyle: "preserve-3d",
            }}
            transition={springTransition}
          >
            {buttonEl}
          </motion.div>
        </motion.div>
      );
    }

    return buttonEl;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
