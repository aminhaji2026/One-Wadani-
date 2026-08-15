type BrandLogoProps = {
  variant?: 'full' | 'mark';
  className?: string;
};

export default function BrandLogo({ variant = 'full', className = '' }: BrandLogoProps) {
  if (variant === 'mark') {
    return (
      <img
        src="/waddani-logo.jpg"
        alt="Xisbiga Waddani"
        className={`brandLogoMark ${className}`.trim()}
      />
    );
  }

  return (
    <figure className={`brandLogoFull ${className}`.trim()}>
      <img src="/waddani-logo.jpg" alt="Xisbiga Waddani — Somaliland National Party" />
    </figure>
  );
}
