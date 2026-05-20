
import { redirect } from 'next/navigation';

interface EditArticuloRedirectParams {
  params: {
    articleId: string;
  };
}

export default function EditArticuloPage({ params }: EditArticuloRedirectParams) {
  redirect(`/profesor/panel-anuncios/editar/${params.articleId}`);
}
