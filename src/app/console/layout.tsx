import "./console.css"
import { Fraunces, Instrument_Serif, JetBrains_Mono } from "next/font/google"
import { Sidebar } from "./_components/Sidebar"

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
})
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata = {
  title: "BP360 · Console",
}

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`console-scope ${fraunces.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <div className="app">
        <Sidebar />
        <main>{children}</main>
      </div>
    </div>
  )
}
