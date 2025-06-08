# 🔐 Whisperrauth

Welcome to **Whisperrauth** – your next-generation, zero-knowledge password manager built with security, privacy, and usability at its core! 🚀

---

## ✨ Features

- 🛡️ **Zero-Knowledge Encryption:** Your data is encrypted on your device. We never see your passwords.
- 🔑 **Secure Password Generator:** Create strong, unique passwords for all your accounts.
- 👆 **Biometric Authentication:** Quickly access your vault with fingerprint or face recognition.
- 🔄 **Automatic Syncing:** Your credentials sync seamlessly across all your devices.
- 🌐 **Cross-Platform Access:** Available on desktop, mobile, and as a browser extension.
- 🔒 **Two-Factor Authentication:** Built-in TOTP code generator for added security.
- 🧑‍💻 **Modern UI:** Clean, responsive, and accessible interface.
- 📨 **Magic Link & OTP Login:** Passwordless authentication for convenience and security.
- 🛠️ **Appwrite Backend:** Secure, scalable, and open-source backend.

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/whisperrnote.git
cd whisperrnote/auth
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

Copy the sample environment file and fill in your Appwrite credentials:

```bash
cp env.sample .env.local
```

Edit `.env.local` and set:

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `NEXT_PUBLIC_APP_BASE_URL`
- ...and other Appwrite collection/database IDs as needed.

### 4. Run the Development Server

```bash
npm run dev
# or
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🏗️ Project Structure

```
/auth
  ├── app/                # Next.js app directory (pages, layouts, providers)
  ├── components/         # Reusable UI components
  ├── lib/                # Utility functions and helpers
  ├── public/             # Static assets
  ├── env.sample          # Sample environment variables
  └── README.md           # This file!
```

---

## 🛠️ Built With

- [Next.js](https://nextjs.org/) – React framework for production
- [Appwrite](https://appwrite.io/) – Secure backend server for authentication and storage
- [Tailwind CSS](https://tailwindcss.com/) – Utility-first CSS framework
- [TypeScript](https://www.typescriptlang.org/) – Typed JavaScript at scale

---

## 📝 Usage

- **Register:** Create a new account with email/password or magic link.
- **Login:** Sign in with password, OTP, or magic link.
- **Vault:** Store, generate, and manage your credentials securely.
- **2FA:** Enable two-factor authentication for extra security.
- **Password Recovery:** Forgot your password? Use the secure recovery flow.

---

## 🧑‍💻 Contributing

Contributions are welcome! 🎉

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/awesome-feature`)
3. Commit your changes (`git commit -m 'Add awesome feature'`)
4. Push to the branch (`git push origin feature/awesome-feature`)
5. Open a Pull Request

---

## 🛡️ Security/Privacy

If you discover a security vulnerability, please open an issue or contact the maintainers directly.

---

## 📄 License

This project is [MIT](LICENSE) licensed.

---

## 🙏 Acknowledgements

- Thanks to the [Appwrite](https://appwrite.io/) and [Next.js](https://nextjs.org/) communities!
- Inspired by the need for simple, secure password management.

---

## 🌟 Stay Secure, Stay Productive!

> _"Your passwords, protected. Everywhere."_

---
