import "./globals.css";

export const metadata = {
  title: "SEAPAC - Relatório de Abastecimento e Controle de Veículos",
  description: "Sistema web monolítico para gerenciamento, controle de quilometragem e abastecimento de veículos da frota do SEAPAC.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
