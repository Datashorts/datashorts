import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(to right,rgb(0, 43, 80),rgb(150, 242, 247))',
      }}
    >
      <SignIn />
      </div>
  )
}