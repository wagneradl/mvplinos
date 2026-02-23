import EditarProdutoClient from './EditarProdutoClient';

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const id = Number(params.id);
  return <EditarProdutoClient id={id} />;
}
