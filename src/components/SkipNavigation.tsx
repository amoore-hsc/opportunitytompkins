import { Button } from "@/components/ui/button";

export const SkipNavigation = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
    >
      <Button variant="default" size="sm">
        Skip to main content
      </Button>
    </a>
  );
};
