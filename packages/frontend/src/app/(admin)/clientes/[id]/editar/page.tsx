import EditarClienteClient from './EditarClienteClient';

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const id = Number(params.id);
  return <EditarClienteClient id={id} />;
}
