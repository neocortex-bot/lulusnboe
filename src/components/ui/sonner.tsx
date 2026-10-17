import { useTheme } from "next-themes";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";
import { TOAST_AUTO_DISMISS_MS, TOAST_ERROR_DISMISS_MS } from "@/lib/toastTiming";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const withLongerDuration =
  (fn: (message: any, data?: any) => any) =>
  (message: any, data?: any) =>
    fn(message, { duration: TOAST_ERROR_DISMISS_MS, ...data });

// Pesan berhasil/biasa hilang dalam 1,5 detik (default Toaster di bawah).
// Error dan peringatan perlu waktu baca lebih lama.
const toast = Object.assign(sonnerToast, {
  error: withLongerDuration(sonnerToast.error),
  warning: withLongerDuration(sonnerToast.warning),
});

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      duration={TOAST_AUTO_DISMISS_MS}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
