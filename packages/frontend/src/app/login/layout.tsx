import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Login | Lino's Panificadora",
  description: "Faça login no sistema da Lino's Panificadora",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
