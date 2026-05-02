/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Patient Bio login link</Preview>
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
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click below to securely log in to Patient Bio. This link expires shortly.
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Log In to Patient Bio
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't request this, you can safely ignore this email.
        </Text>
        <Text style={copyright}>
          © {new Date().getFullYear()} Patient Bio. Your Health, Your Data.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }
const container = { padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '32px' }
const logo = { borderRadius: '12px', margin: '0 auto' }
const brandName = { fontSize: '20px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 4%)', margin: '12px 0 0', textAlign: 'center' as const }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: 'hsl(240, 10%, 4%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(240, 4%, 46%)', lineHeight: '1.6', margin: '0 0 20px' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: 'hsl(262, 83%, 58%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '16px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#999999', margin: '32px 0 8px', lineHeight: '1.5' }
const copyright = { fontSize: '12px', color: '#cccccc', margin: '0', textAlign: 'center' as const }
