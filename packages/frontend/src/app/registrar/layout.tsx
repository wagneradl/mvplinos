import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Cadastre sua Empresa | Lino's Panificadora",
  description: "Solicite o cadastro da sua empresa no sistema da Lino's Panificadora",
};

export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
