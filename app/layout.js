import './globals.css';

export const metadata = {
  title: 'Cổng Thông Tin & Tương Tác Khuyến Nông Cao Bằng',
  description: 'Trung tâm Khuyến nông và Giống Nông lâm nghiệp tỉnh Cao Bằng',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-stone-50 text-gray-800 antialiased">
        {children}
      </body>
    </html>
  );
}