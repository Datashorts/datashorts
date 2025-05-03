# DataChat--->new name is datashorts
watashi wa wohohohohoho
DataChat is a modern web application that allows you to interact with your database using natural language. Ask questions about your data in plain English and get instant answers without writing any SQL.

## Features

- **Natural Language Database Queries**: Ask questions about your data in plain English
- **User Authentication**: Secure login and user management with Clerk
- **Real-time Chat Interface**: Interactive chat experience for database queries
- **Modern UI**: Clean, responsive design built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Authentication**: Clerk
- **Database**: Neon PostgreSQL with DrizzleORM
- **Vector Database**: Pinecone
- **AI/ML**: OpenAI Embeddings (text-embedding-ada-002), Grok API

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Clerk account for authentication
- A Neon PostgreSQL database
- A Pinecone account for vector storage
- OpenAI API access
- Grok API access

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/datachat.git
   cd datachat
   ```
2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```
3. Set up environment variables:
   Create a `.env.local` file in the root directory with the following variables:

   ```
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

   # Database Connection
   NEXT_PUBLIC_DRIZZLE_DATABASE_URL=your_neon_postgresql_connection_string

   # Vector Database
   PINECONE_API_KEY=your_pinecone_api_key
   PINECONE_INDEX_NAME=your_pinecone_index_name

   # AI Services
   OPENAI_API_KEY=your_openai_api_key
   XAI_API_KEY=your_grok_api_key

   # Other Configuration
   NODE_TLS_REJECT_UNAUTHORIZED=0
   ```
4. Run the development server:

   ```bash
   npm run dev
   # or
   yarn dev
   ```
5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Environment Variables

Here's a detailed explanation of the environment variables:

| Variable                                            | Description                       | Required |
| --------------------------------------------------- | --------------------------------- | -------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Your Clerk publishable key        | Yes      |
| `CLERK_SECRET_KEY`                                | Your Clerk secret key             | Yes      |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                   | URL for sign-in page              | Yes      |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                   | URL for sign-up page              | Yes      |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Redirect URL after sign-in        | Yes      |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Redirect URL after sign-up        | Yes      |
| `NEXT_PUBLIC_DRIZZLE_DATABASE_URL`                | Neon PostgreSQL connection string | Yes      |
| `PINECONE_API_KEY`                                | Your Pinecone API key             | Yes      |
| `PINECONE_INDEX_NAME`                             | Name of your Pinecone index       | Yes      |
| `OPENAI_API_KEY`                                  | Your OpenAI API key               | Yes      |
| `XAI_API_KEY`                                     | Your Grok API key                 | Yes      |
| `NODE_TLS_REJECT_UNAUTHORIZED`                    | SSL verification setting          | Yes      |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Next.js](https://nextjs.org/)
- [Clerk](https://clerk.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Neon PostgreSQL](https://neon.tech/)
- [DrizzleORM](https://orm.drizzle.team/)
- [Pinecone](https://www.pinecone.io/)
- [OpenAI](https://openai.com/)
- [Grok API](https://grok.x.ai/)
