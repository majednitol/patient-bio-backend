/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Patient Bio verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Img
            src="https://mepbtytqjupnyqhbckja.supabase.co/storage/v1/object/public/avatars/patient-bio-logo.jpg?v=1"
            alt="Patient Bio"
            width="48"
            height="48"
            style={logo}
          />
          <Text style={brandName}>Patient Bio</Text>
        </Section>
        <Heading style={h1}>Verification code</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore it.
        </Text>
        <Text style={copyright}>
          © {new Date().getFullYear()} Patient Bio. Your Health, Your Data.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '32px' }
const logo = { borderRadius: '12px', margin: '0 auto' }
const brandName = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 4%)', margin: '12px 0 0', textAlign: 'center' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 4%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(240, 4%, 46%)', lineHeight: '1.6', margin: '0 0 20px' }
const codeStyle = {
  fontFamily: "'SF Mono', Menlo, Courier, monospace",
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: 'hsl(262, 83%, 58%)',
  textAlign: 'center' as const,
  letterSpacing: '6px',
  margin: '8px 0 32px',
  padding: '16px',
  backgroundColor: 'hsl(262, 83%, 58%, 0.06)',
  borderRadius: '12px',
}
const footer = { fontSize: '13px', color: '#999999', margin: '32px 0 8px', lineHeight: '1.5' }
const copyright = { fontSize: '12px', color: '#cccccc', margin: '0', textAlign: 'center' as const }
