"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <>
      <div className="lg:hidden">
        <SonnerToaster
          closeButton
          duration={4000}
          position="bottom-center"
          richColors
          toastOptions={{
            duration: 4000,
            className: "font-sans",
            style: {
              maxWidth: "min(100% - 2rem, 360px)"
            }
          }}
        />
      </div>
      <div className="hidden lg:block">
        <SonnerToaster
          closeButton
          duration={4000}
          position="top-right"
          richColors
          toastOptions={{
            className: "font-sans"
          }}
        />
      </div>
    </>
  );
}
