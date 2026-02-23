import EditarUsuarioClient from './EditarUsuarioClient';

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const id = Number(params.id);
  return <EditarUsuarioClient id={id} />;
}
