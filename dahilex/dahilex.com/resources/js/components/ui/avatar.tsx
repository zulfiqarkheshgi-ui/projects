import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
    className,
    children,
    ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
    const COLORS = [
        'bg-red-50 text-red-700 border-red-300',
        'bg-orange-50 text-orange-700 border-orange-300',
        'bg-amber-50 text-amber-700 border-amber-300',
        'bg-yellow-50 text-yellow-700 border-yellow-300',
        'bg-lime-50 text-lime-700 border-lime-300',
        'bg-green-50 text-green-700 border-green-300',
        'bg-teal-50 text-teal-700 border-teal-300',
        'bg-cyan-50 text-cyan-700 border-cyan-300',
        'bg-sky-50 text-sky-700 border-sky-300',
        'bg-blue-50 text-blue-700 border-blue-300',
        'bg-indigo-50 text-indigo-700 border-indigo-300',
        'bg-violet-50 text-violet-700 border-violet-300',
        'bg-purple-50 text-purple-700 border-purple-300',
        'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300',
        'bg-pink-50 text-pink-700 border-pink-300',
        'bg-rose-50 text-rose-700 border-rose-300',
    ]

    function pickColor(text: string) {
        const hash = [...text].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
        return COLORS[hash % COLORS.length]
    }
    const text = typeof children === 'string' ? children : '';
    return (
        <AvatarPrimitive.Fallback
          data-slot="avatar-fallback"
          className={cn(
            `flex size-full items-center justify-center rounded-full font-semibold text-sm border ${text ? pickColor(text) : 'bg-gray-50 text-gray-700 border-gray-300'}`,
            className
          )}
          {...props}
        >
          {children}
        </AvatarPrimitive.Fallback>
    )
}

export { Avatar, AvatarImage, AvatarFallback }
