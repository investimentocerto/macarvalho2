import type {Metadata} from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MaCarvalho - Cosméticos Artesanais',
  description: 'Sistema de Gestão e Controle de Produção Artesanal - MaCarvalho Cosméticos Artesanais.',
  openGraph: {
    title: 'MaCarvalho - Cosméticos Artesanais',
    description: 'Sistema de Gestão e Controle de Produção Artesanal - MaCarvalho Cosméticos Artesanais.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MaCarvalho - Cosméticos Artesanais',
    description: 'Sistema de Gestão e Controle de Produção Artesanal - MaCarvalho Cosméticos Artesanais.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-br">
      <body className="antialiased bg-[#faf9f7] text-[#1a1c1b]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

