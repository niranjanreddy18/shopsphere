/**
 * Content for every StaticInfoPage route. Kept as plain data (not JSX)
 * separate from the component so the copy can be reviewed/edited without
 * touching rendering logic, and so this file exports no components itself
 * (fast-refresh friendliness — see the same pattern used for
 * utils/deliveryEstimate.js).
 */

export const STATIC_PAGES = {
  about: {
    title: "About ShopSphere",
    subtitle: "Quality products, fair prices, fast shipping.",
    sections: [
      {
        heading: "Our story",
        paragraphs: [
          "ShopSphere started with a simple idea: online shopping should feel effortless, transparent, and " +
            "genuinely helpful — not a maze of upsells and dark patterns. Every feature on this site, from " +
            "guest checkout to real-time order tracking, was built around that principle.",
        ],
      },
      {
        heading: "What we stand for",
        paragraphs: [
          "Fair pricing with no hidden fees, honest product descriptions, and a support team that actually " +
            "resolves issues instead of forwarding them. We'd rather have fewer, happier customers than chase " +
            "every sale.",
        ],
      },
    ],
  },
  careers: {
    title: "Careers at ShopSphere",
    subtitle: "Help us build the most trustworthy storefront on the web.",
    sections: [
      {
        heading: "Open roles",
        paragraphs: [
          "We're not currently hiring, but we're always glad to hear from engineers, designers, and support " +
            "specialists who care about craft. Reach out via the Contact Us page and tell us what you'd want to work on.",
        ],
      },
    ],
  },
  press: {
    title: "Press & Media",
    sections: [
      {
        heading: "Press inquiries",
        paragraphs: ["For interview requests, brand assets, or press inquiries, please reach out via the Contact Us page."],
      },
    ],
  },
  sustainability: {
    title: "Sustainability",
    sections: [
      {
        heading: "Our commitment",
        paragraphs: [
          "We're working toward carbon-neutral shipping and recyclable packaging across our catalog. " +
            "This page will grow as those initiatives roll out store-wide.",
        ],
      },
    ],
  },
  help: {
    title: "Help Center",
    subtitle: "Find answers to the most common questions below.",
    sections: [
      {
        heading: "Where's my order?",
        paragraphs: ["Track any order's status and delivery estimate from your Order History page once you're signed in."],
      },
      {
        heading: "How do I return an item?",
        paragraphs: ["See our Returns & Refunds page for the full policy — most items can be returned within 30 days of delivery."],
      },
      {
        heading: "How do I contact support?",
        paragraphs: ["Visit Contact Us for every way to reach our support team."],
      },
    ],
  },
  returns: {
    title: "Returns & Refunds",
    sections: [
      {
        heading: "30-day return policy",
        paragraphs: [
          "Most items can be returned within 30 days of delivery for a full refund, provided they're unused and " +
            "in their original packaging. Refunds are issued to the original payment method within 5–7 business days " +
            "of us receiving the returned item.",
        ],
      },
      {
        heading: "How to start a return",
        paragraphs: [
          "Open the order from your Order History page and select \"Cancel Order\" if it hasn't shipped yet. " +
            "For delivered orders, contact support to receive a return shipping label.",
        ],
      },
    ],
  },
  shipping: {
    title: "Shipping Information",
    sections: [
      {
        heading: "Delivery estimates",
        paragraphs: [
          "Standard delivery takes 3–5 business days. Orders over $50 ship free; smaller orders include a flat " +
            "shipping charge calculated at checkout.",
        ],
      },
      {
        heading: "Order tracking",
        paragraphs: ["Once your order ships, tracking details appear on the order's detail page under \"Order Tracking.\""],
      },
    ],
  },
  contact: {
    title: "Contact Us",
    subtitle: "We usually respond within one business day.",
    sections: [
      {
        heading: "Email",
        paragraphs: ["support@shopsphere.example — for order issues, returns, and general questions."],
      },
      {
        heading: "Hours",
        paragraphs: ["Monday–Friday, 9am–6pm ET."],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    subtitle: "Last updated January 2026.",
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "Account information (name, email, shipping/billing addresses), order history, and basic usage " +
            "analytics needed to operate the store securely and reliably.",
        ],
      },
      {
        heading: "What we don't do",
        paragraphs: [
          "We never sell your personal data to third parties. Payment details are handled entirely by Stripe — " +
            "our servers never see or store your card number.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: ["You can request a copy of your data or ask us to delete your account at any time via Contact Us."],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    subtitle: "Last updated January 2026.",
    sections: [
      {
        heading: "Using ShopSphere",
        paragraphs: [
          "By creating an account or placing an order, you agree to provide accurate information and use the " +
            "site only for lawful purchases.",
        ],
      },
      {
        heading: "Orders & pricing",
        paragraphs: [
          "Prices are shown in USD and may change without notice; the price at checkout is the price you'll be charged.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    sections: [
      {
        heading: "How we use cookies",
        paragraphs: [
          "We use essential cookies to keep you signed in and remember your cart, and basic analytics cookies " +
            "to understand site usage. We don't use third-party advertising cookies.",
        ],
      },
    ],
  },
  accessibility: {
    title: "Accessibility Statement",
    sections: [
      {
        heading: "Our commitment",
        paragraphs: [
          "ShopSphere is built with keyboard navigation, screen-reader labeling, and visible focus states " +
            "throughout. If you encounter an accessibility barrier anywhere on the site, please let us know via " +
            "Contact Us — we treat these reports as high priority.",
        ],
      },
    ],
  },
};
