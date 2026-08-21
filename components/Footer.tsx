import Link from "next/link";
import {
  FaFacebook,
  FaInstagram,
  FaWhatsapp,
  FaYoutube,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
} from "react-icons/fa";

const CompanyInfo = [
  { name: "About Us", href: "/about" },
  { name: "Careers", href: "/careers" },
  { name: "Privacy Policy", href: "/privacy" },
  { name: "Terms & Conditions", href: "/terms" },
];

const HelpInfo = [
  { name: "FAQs", href: "/faqs" },
  { name: "Shipping Policy", href: "/shipping" },
  { name: "Refund Policy", href: "/refund" },
  { name: "Cancellation Policy", href: "/cancellation" },
];

const SocialMediaLinks = [
  {
    name: "Facebook",
    icon: FaFacebook,
    href: "https://www.facebook.com/froodeo",
    color: "#1877F2",
  },
  {
    name: "Instagram",
    icon: FaInstagram,
    href: "https://www.instagram.com/froodeo",
    color: "#E1306C",
  },
  {
    name: "YouTube",
    icon: FaYoutube,
    href: "https://www.youtube.com/froodeo",
    color: "#FF0000",
  },
  {
    name: "WhatsApp",
    icon: FaWhatsapp,
    href: "https://wa.me/911234567890",
    color: "#25D366",
  },
];

export const Footer = () => {
  return (
    <footer className="w-full bg-black px-6 py-12 text-white md:px-10">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 md:grid-cols-5">
        {/* Logo & Tagline */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <span className="text-2xl">🔥</span>

            <h2 className="text-2xl font-extrabold tracking-wide text-orange-500">
              FROODEO
            </h2>
          </div>

          <p className="text-sm text-gray-300">
            Royal Taste, Real Price
          </p>

          <p className="mt-4 text-xs text-gray-500">
            © {new Date().getFullYear()} Froodeo. All Rights Reserved.
          </p>
        </div>

        {/* Company */}
        <div>
          <h3 className="mb-3 text-base font-semibold">
            Company
          </h3>

          <ul className="space-y-2">
            {CompanyInfo.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Help */}
        <div>
          <h3 className="mb-3 text-base font-semibold">
            Help
          </h3>

          <ul className="space-y-2">
            {HelpInfo.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-gray-400 transition-colors hover:text-white"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Us */}
        <div>
          <h3 className="mb-3 text-base font-semibold">
            Contact Us
          </h3>

          <ul className="space-y-3">
            <li className="flex items-center gap-2 text-sm text-gray-400">
              <FaPhoneAlt
                className="shrink-0"
                size={14}
              />
              <span>+91 123 456 7890</span>
            </li>

            <li className="flex items-center gap-2 text-sm text-gray-400">
              <FaEnvelope
                className="shrink-0"
                size={14}
              />
              <span>hello@froodeo.in</span>
            </li>

            <li className="flex items-start gap-2 text-sm text-gray-400">
              <FaMapMarkerAlt
                className="mt-0.5 shrink-0"
                size={14}
              />

              <span>
                Lucknow, Uttar Pradesh
                <br />
                India - 226001
              </span>
            </li>
          </ul>
        </div>

        {/* Follow Us */}
        <div>
          <h3 className="mb-3 text-base font-semibold">
            Follow Us
          </h3>

          <div className="flex gap-3">
            {SocialMediaLinks.map((link) => {
              const Icon = link.icon;

              return (
                <a
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Follow Froodeo on ${link.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white transition-transform duration-200 hover:scale-110"
                  style={{
                    backgroundColor: link.color,
                  }}
                >
                  <Icon size={16} />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};