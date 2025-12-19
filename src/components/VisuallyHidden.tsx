interface VisuallyHiddenProps {
  children: React.ReactNode;
}

export const VisuallyHidden = ({ children }: VisuallyHiddenProps) => {
  return <span className="sr-only">{children}</span>;
};
