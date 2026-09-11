import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f7] text-[#1a1c1b] p-6 text-center">
      <h1 className="text-4xl font-bold text-[#954a00] mb-2">404</h1>
      <p className="text-sm text-[#574335] mb-6">Página não encontrada no sistema MaCarvalho.</p>
      <Link 
        href="/"
        className="px-4 py-2 bg-[#954a00] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#713700] transition-colors"
      >
        Voltar ao Início
      </Link>
    </div>
  );
}
