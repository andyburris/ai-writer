import React, { forwardRef, TextareaHTMLAttributes } from "react"
import { Button as AriaButton, ButtonProps } from "react-aria-components"
import { LinkProps, Link as ReactLink } from "react-router"
import { Switch as AriaSwitch, SwitchProps } from "react-aria-components"
import { AriaTextFieldProps, useTextField } from 'react-aria';

type WrappableComponent<P = {}> = React.ComponentType<P & { className?: string }>

type ClassesFunction<P> = (props: P) => string

function withTailwindClasses<P extends object, CP extends object = {}>(
  WrappedComponent: WrappableComponent<P>,
  getClasses: ClassesFunction<P & CP>
) {
  return React.forwardRef<HTMLElement, P & CP & { className?: string }>(
    function Forwarded(props, ref) {
      const { className, ...otherProps } = props
      
      return (
        <WrappedComponent
          {...otherProps as P}
          ref={ref}
          className={`${getClasses(props as P & CP)} ${className || ""}`}
        />
      )
    }
  )
}

// Define custom props for Button
interface CustomButtonProps {
  kind?: "primary" | "secondary" | "ghost" | "danger" | "unstyled",
  size?: "sm" | "md" | "lg",
  decoration?: boolean
}

const customButtonProps = ({ kind = "ghost", size = "md", decoration = true, }) => {
  const sizeClasses =
    size === "sm" ? "px-2 py-2 min-w-8 min-h-8" + (decoration ? " rounded-md" : "")
    : size === "md" ? "px-2 py-2 min-w-10 min-h-10"  + (decoration ? " rounded-lg" : "")
    : "px-4 py-3 min-w-12 min-h-12" + (decoration ? " rounded-2xl" : "")
  const focusClasses = `focus:outline-hidden focus-visible:ring-2 focus-visible:ring-opacity-50 ring-offset-2 disabled:opacity-50`
  const baseClasses = `${sizeClasses} ${focusClasses} w-fit gap-2 flex items-center justify-center font-semibold`
  switch (kind) {
    case "primary":
      return `${baseClasses} ${decoration ? "shadow-outset" : ""} bg-stone-600 text-white hover:bg-stone-700 pressed:bg-stone-800 focus-visible:ring-stone-500`
    case "secondary":
      return `${baseClasses} ${decoration ? "shadow-outset" : ""} bg-stone-50 text-stone-800 hover:bg-stone-200 pressed:bg-stone-300 focus-visible:ring-stone-400`
    case "ghost":
      return `${baseClasses} text-stone-500 hover:text-stone-600 hover:bg-stone-100 pressed:text-stone-700 focus-visible:ring-stone-400`
    case "danger":
      return `${baseClasses} ${decoration ? "shadow-outset" : ""} bg-red-500 text-white hover:bg-red-600 pressed:bg-red-700 focus-visible:ring-red-500`
    case "unstyled":
      return `text-left ${focusClasses} focus-visible:ring-stone-400`
  }
  return ""
}

export const Button = withTailwindClasses<ButtonProps, CustomButtonProps>(AriaButton, customButtonProps)

type AllLinkProps = LinkProps & { children?: React.ReactNode;} & React.RefAttributes<HTMLAnchorElement>
export const Link = withTailwindClasses<AllLinkProps, CustomButtonProps>(ReactLink, customButtonProps)