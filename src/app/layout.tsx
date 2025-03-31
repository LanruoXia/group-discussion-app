import "./globals.css";
import NavBar from "./components/NavBar";

export const metadata = {
  title: "HKDSE English Evaluation",
  description: "Practice your English speaking skills for HKDSE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
